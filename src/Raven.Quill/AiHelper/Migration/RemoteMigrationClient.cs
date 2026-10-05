using System.Net;
using System.Text;
using System.Text.Json;
using Raven.Client.Documents;
using Raven.Client.Documents.Operations.CdcSink.Schema;
using Raven.Quill.AiHelper.Migration.Planning;
using Raven.Quill.Endpoints.Helpers;
using Raven.Quill.Logging;
using Sparrow.Json;

namespace Raven.Quill.AiHelper.Migration;

public sealed class RemoteMigrationClient(
    HttpClient httpClient,
    IDocumentStore store,
    MigrationPlanStore plans,
    QuillLogger<RemoteMigrationClient> logger) : IMigrationClient
{
    public const string StartPath = "/assistant/migration/start";

    public const string AskPath = "/assistant/migration/ask";

    private const string DataPrefix = "data: ";

    public Task StartAsync(MigrationStartCommand command, Func<MigrationFrame, Task> onFrame, CancellationToken token) =>
        RelayAsync(
            StartPath,
            new PlannerRequest { Slug = command.Slug, Schema = command.Schema, Prompt = command.Prompt },
            command.Slug,
            conversationId: null,
            new MigrationPlan(),
            onFrame,
            token);

    public async Task AskAsync(MigrationAskCommand command, Func<MigrationFrame, Task> onFrame, CancellationToken token)
    {
        var plan = new MigrationPlan();

        if (await plans.LoadAsync(command.ConversationId, token) is { } state)
            plan.Restore(state);

        await RelayAsync(
            AskPath,
            new PlannerRequest { Slug = command.Slug, ConversationId = command.ConversationId, Schema = command.Schema, Prompt = command.Prompt },
            command.Slug,
            command.ConversationId,
            plan,
            onFrame,
            token);
    }

    public async Task<IReadOnlyCollection<PlanEntry>?> GetAsync(string slug, string conversationId, CancellationToken token)
    {
        var state = await plans.LoadAsync(conversationId, token);

        return state is not null && string.Equals(state.Slug, slug, StringComparison.OrdinalIgnoreCase)
            ? state.Entries
            : null;
    }

    private async Task RelayAsync(
        string path,
        PlannerRequest request,
        string slug,
        string? conversationId,
        MigrationPlan plan,
        Func<MigrationFrame, Task> onFrame,
        CancellationToken token)
    {
        HttpResponseMessage response;

        try
        {
            using var content = new StringContent(SerializeRequest(request), Encoding.UTF8, "application/json");
            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, path) { Content = content };
            response = await httpClient.SendAsync(httpRequest, HttpCompletionOption.ResponseHeadersRead, token);
        }
        catch (HttpRequestException e)
        {
            if (logger.IsWarnEnabled)
                logger.Warn(e, $"Planner {path} failed (transport).");

            await onFrame(new ErrorFrame { Message = "The AI service could not be reached." });
            return;
        }

        using (response)
        {
            if (response.IsSuccessStatusCode == false)
            {
                if (logger.IsInfoEnabled)
                    logger.Info($"Planner {path} failed: upstream {(int)response.StatusCode}.");

                await onFrame(new ErrorFrame { Message = DescribeFailure(response.StatusCode) });
                return;
            }

            await using var body = await response.Content.ReadAsStreamAsync(token);
            using var reader = new StreamReader(body, Encoding.UTF8);

            while (await reader.ReadLineAsync(token) is { } line)
            {
                if (line.StartsWith(DataPrefix, StringComparison.Ordinal) == false)
                    continue;

                var frame = ReadFrame(path, line[DataPrefix.Length..]);
                if (frame is null)
                    continue;

                if (frame is DoneFrame done)
                    conversationId = done.ConversationId;

                if (Mirror(plan, frame) && conversationId is not null)
                    await plans.SaveAsync(slug, conversationId, plan, token);

                await onFrame(frame);
            }
        }
    }

    private MigrationFrame? ReadFrame(string path, string json)
    {
        try
        {
            return JsonSerializer.Deserialize<MigrationFrame>(json, NdjsonStream.JsonOpts);
        }
        catch (JsonException e)
        {
            if (logger.IsWarnEnabled)
                logger.Warn(e, $"Planner {path} sent a frame that could not be read; skipping it.");

            return null;
        }
    }

    private static bool Mirror(MigrationPlan plan, MigrationFrame frame)
    {
        switch (frame)
        {
            case CollectionFrame collection:
                plan.Upsert(collection.Collection, collection.Rationale, collection.Config);
                return true;

            case RemovedFrame { Collection: not null } removed:
                plan.Remove(removed.Collection);
                return true;

            case ConventionsFrame conventions:
                plan.SetConventions(new NamingConventions(conventions.PropertyCase, conventions.PropertyLanguage, conventions.Notes));
                return true;

            case DoneFrame:
                return true;

            default:
                return false;
        }
    }

    private static string DescribeFailure(HttpStatusCode statusCode) => statusCode switch
    {
        HttpStatusCode.Unauthorized => "The AI service refused the request: consent is required or the license was not accepted.",
        HttpStatusCode.TooManyRequests => "The monthly AI token quota is used up.",
        HttpStatusCode.NotFound => "No planning session found for that conversation.",
        HttpStatusCode.BadRequest => "The AI service rejected the planning request.",
        _ => $"The AI service failed (HTTP {(int)statusCode})."
    };

    private string SerializeRequest(PlannerRequest request)
    {
        using var ctx = JsonOperationContext.ShortTermSingleUse();
        return store.Conventions.Serialization.DefaultConverter.ToBlittable(request, ctx).ToString();
    }

    private sealed class PlannerRequest
    {
        public string? Slug { get; init; }

        public string? ConversationId { get; init; }

        public CdcSinkSourceSchema? Schema { get; init; }

        public string? Prompt { get; init; }
    }
}
