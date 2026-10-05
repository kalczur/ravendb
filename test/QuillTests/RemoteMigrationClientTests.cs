using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using FastTests;
using Raven.Client.Documents.Operations.CdcSink;
using Raven.Client.Documents.Operations.CdcSink.Schema;
using Raven.Quill.AiHelper.Migration;
using Raven.Quill.AiHelper.Migration.Planning;
using Raven.Quill.Logging;
using Tests.Infrastructure;
using Xunit;

namespace QuillTests;

public class RemoteMigrationClientTests(ITestOutputHelper output) : RavenTestBase(output)
{
    private static readonly JsonSerializerOptions WireOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Converters = { new JsonStringEnumConverter() },
        IncludeFields = true,
    };

    [RavenFact(RavenTestCategory.Quill)]
    public async Task Start_relays_the_frames_skips_keepalives_and_mirrors_the_plan_on_done()
    {
        using var store = GetDocumentStore();
        var handler = new StubHandler(HttpStatusCode.OK, Sse(
            new NoteFrame { Text = "reading" },
            new CollectionFrame { Status = "registered", Collection = "Orders", Version = 1, Rationale = "because", Config = Orders() },
            new ReplyFrame { Reply = "Orders it is." },
            new DoneFrame { ConversationId = "quill-cdc-planner/1" }));
        var client = NewClient(store, handler);
        var frames = new List<MigrationFrame>();

        await client.StartAsync(new MigrationStartCommand("shop", Schema(), "plan it"), Collect(frames), CancellationToken.None);

        Assert.Equal(RemoteMigrationClient.StartPath, handler.LastPath);
        Assert.Collection(frames,
            f => Assert.IsType<NoteFrame>(f),
            f => Assert.Equal("Orders", Assert.IsType<CollectionFrame>(f).Config!.CollectionName),
            f => Assert.Equal("Orders it is.", Assert.IsType<ReplyFrame>(f).Reply),
            f => Assert.Equal("quill-cdc-planner/1", Assert.IsType<DoneFrame>(f).ConversationId));

        var plan = await client.GetAsync("shop", "quill-cdc-planner/1", CancellationToken.None);
        Assert.Equal("Orders", Assert.Single(plan!.Entries).Collection);
        Assert.Null(await client.GetAsync("another-app", "quill-cdc-planner/1", CancellationToken.None));
    }

    [RavenFact(RavenTestCategory.Quill)]
    public async Task Ask_continues_from_the_stored_mirror_and_applies_removals_and_conventions()
    {
        using var store = GetDocumentStore();
        var stored = new MigrationPlanState { Slug = "shop" };
        stored.Upsert("Orders", null, Orders());
        stored.Upsert("Products", null, Orders("Products"));
        await stored.SaveAsync(store, "quill-cdc-planner/1");

        var handler = new StubHandler(HttpStatusCode.OK, Sse(
            new RemovedFrame { Collection = "Products", Reason = "embedded instead" },
            new ConventionsFrame { PropertyCase = PropertyCase.SnakeCase, PropertyLanguage = "Spanish", MustReEmit = ["Orders"] },
            new ReplyFrame { Reply = "Done." },
            new DoneFrame { ConversationId = "quill-cdc-planner/1" }));
        var client = NewClient(store, handler);

        var plan = await client.GetAsync("shop", "quill-cdc-planner/1", CancellationToken.None);
        await client.AskAsync(new MigrationAskCommand("shop", "quill-cdc-planner/1", Schema(), "drop products"), plan!, Collect([]), CancellationToken.None);

        Assert.Equal(RemoteMigrationClient.AskPath, handler.LastPath);
        Assert.Contains("\"ConversationId\":\"quill-cdc-planner/1\"", handler.LastBody);

        var state = await MigrationPlanState.LoadAsync(store, "quill-cdc-planner/1");
        Assert.Equal("Orders", Assert.Single(state!.Entries).Collection);
        Assert.Equal(PropertyCase.SnakeCase, state.Conventions.PropertyCase);
        Assert.Equal("Spanish", state.Conventions.PropertyLanguage);
    }

    [RavenFact(RavenTestCategory.Quill)]
    public async Task Start_sends_the_schema_and_prompt_without_a_conversation()
    {
        using var store = GetDocumentStore();
        var handler = new StubHandler(HttpStatusCode.OK, Sse(new DoneFrame { ConversationId = "quill-cdc-planner/1" }));

        await NewClient(store, handler).StartAsync(new MigrationStartCommand("shop", Schema(), "plan it"), Collect([]), CancellationToken.None);

        Assert.Contains("\"Slug\":\"shop\"", handler.LastBody);
        Assert.Contains("\"Prompt\":\"plan it\"", handler.LastBody);
        Assert.Contains("\"SourceTableName\":\"orders\"", handler.LastBody);
        Assert.DoesNotContain("\"ConversationId\":\"", handler.LastBody);
    }

    [RavenTheory(RavenTestCategory.Quill)]
    [InlineData(HttpStatusCode.Unauthorized, "consent")]
    [InlineData(HttpStatusCode.TooManyRequests, "quota")]
    [InlineData(HttpStatusCode.NotFound, "No planning session")]
    [InlineData(HttpStatusCode.BadGateway, "HTTP 502")]
    public async Task A_refused_request_becomes_one_error_frame(HttpStatusCode status, string expected)
    {
        using var store = GetDocumentStore();
        var frames = new List<MigrationFrame>();

        await NewClient(store, new StubHandler(status, "{\"Status\":\"Refused\"}"))
            .StartAsync(new MigrationStartCommand("shop", Schema(), "plan it"), Collect(frames), CancellationToken.None);

        Assert.Contains(expected, Assert.IsType<ErrorFrame>(Assert.Single(frames)).Message);
    }

    [RavenFact(RavenTestCategory.Quill)]
    public async Task An_unreadable_frame_is_skipped_and_the_rest_still_arrive()
    {
        using var store = GetDocumentStore();
        var body = "data: {\"type\":\"no-such-frame\"}\n\n" + Sse(new DoneFrame { ConversationId = "quill-cdc-planner/1" });
        var frames = new List<MigrationFrame>();

        await NewClient(store, new StubHandler(HttpStatusCode.OK, body))
            .StartAsync(new MigrationStartCommand("shop", Schema(), "plan it"), Collect(frames), CancellationToken.None);

        Assert.IsType<DoneFrame>(Assert.Single(frames));
    }

    [RavenFact(RavenTestCategory.Quill)]
    public async Task Upsert_bumps_the_version_case_insensitively_and_remove_drops_it()
    {
        using var store = GetDocumentStore();
        var plan = new MigrationPlanState { Slug = "shop" };

        plan.Upsert("Orders", "first", Orders());
        plan.Upsert("orders", "second", Orders());
        plan.Upsert("Products", null, Orders("Products"));
        plan.Remove("PRODUCTS");
        await plan.SaveAsync(store, "quill-cdc-planner/1");

        var loaded = await MigrationPlanState.LoadAsync(store, "quill-cdc-planner/1");

        var entry = Assert.Single(loaded!.Entries);
        Assert.Equal("orders", entry.Collection);
        Assert.Equal("second", entry.Rationale);
        Assert.Equal(2, entry.Version);

        loaded.Upsert("Orders", "third", Orders());
        await loaded.SaveAsync(store, "quill-cdc-planner/1");

        var reloaded = await MigrationPlanState.LoadAsync(store, "quill-cdc-planner/1");
        Assert.Equal(3, Assert.Single(reloaded!.Entries).Version);
    }

    private static RemoteMigrationClient NewClient(Raven.Client.Documents.IDocumentStore store, StubHandler handler) =>
        new(new HttpClient(handler) { BaseAddress = new Uri("http://localhost") },
            store,
            new QuillLogger<RemoteMigrationClient>());

    private static Func<MigrationFrame, Task> Collect(List<MigrationFrame> frames) => frame =>
    {
        frames.Add(frame);
        return Task.CompletedTask;
    };

    private static string Sse(params MigrationFrame[] frames) =>
        ": keepalive\n\n" + string.Concat(frames.Select(f => $"data: {JsonSerializer.Serialize(f, WireOptions)}\n\n: keepalive\n\n"));

    private static CdcSinkSourceSchema Schema() => new()
    {
        CatalogName = "shop",
        Tables =
        [
            new CdcSinkSourceTable
            {
                SourceTableSchema = "public",
                SourceTableName = "orders",
                Columns = [new CdcSinkSourceColumn { Name = "order_id", NativeType = "int" }]
            }
        ]
    };

    private static CdcSinkTableConfig Orders(string collection = "Orders") => new()
    {
        CollectionName = collection,
        SourceTableSchema = "public",
        SourceTableName = "orders",
        PrimaryKeyColumns = ["order_id"],
        Columns = [new CdcColumnMapping { Column = "order_id", Name = "OrderId" }]
    };

    private sealed class StubHandler(HttpStatusCode status, string body) : HttpMessageHandler
    {
        public string? LastPath { get; private set; }

        public string LastBody { get; private set; } = string.Empty;

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastPath = request.RequestUri!.AbsolutePath;
            LastBody = await request.Content!.ReadAsStringAsync(cancellationToken);

            return new HttpResponseMessage(status)
            {
                Content = new StringContent(body, Encoding.UTF8, status == HttpStatusCode.OK ? "text/event-stream" : "application/json")
            };
        }
    }
}
