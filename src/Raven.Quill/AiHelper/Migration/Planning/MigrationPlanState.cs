using Raven.Client.Documents;
using Raven.Client.Documents.Operations.CdcSink;

namespace Raven.Quill.AiHelper.Migration.Planning;

/// <summary>
/// What the model registered in a conversation, kept between the requests of one wizard session:
/// every turn and the final apply are separate calls, and each needs the plan as it stands.
/// </summary>
public sealed class MigrationPlanState
{
    public const string Collection = "@migration-plans";

    private Dictionary<string, PlanEntry>? _index;

    public string Id { get; set; } = string.Empty;

    /// <summary>The app this planning session belongs to. A conversation is never shared between apps.</summary>
    public string Slug { get; set; } = string.Empty;

    // A fresh instance per document: the store fills an existing value in place when loading, so a
    // shared default would carry one plan's conventions into every plan loaded after it.
    public NamingConventions Conventions { get; set; } = new();

    public List<PlanEntry> Entries { get; set; } = [];

    public static string DocumentId(string conversationId) => $"{Collection}/{conversationId}";

    public static async Task<MigrationPlanState?> LoadAsync(IDocumentStore store, string conversationId, CancellationToken token = default)
    {
        using var session = store.OpenAsyncSession();
        return await session.LoadAsync<MigrationPlanState>(DocumentId(conversationId), token);
    }

    public async Task SaveAsync(IDocumentStore store, string conversationId, CancellationToken token = default)
    {
        Id = DocumentId(conversationId);

        if (_index is not null)
            Entries = _index.Values.ToList();

        using var session = store.OpenAsyncSession();
        await session.StoreAsync(this, Id, token);
        await session.SaveChangesAsync(token);
    }

    public void Upsert(string collection, string? rationale, CdcSinkTableConfig? config)
    {
        var index = Index();
        var version = index.TryGetValue(collection, out var existing) ? existing.Version + 1 : 1;

        index[collection] = new PlanEntry
        {
            Collection = collection,
            Rationale = rationale,
            Config = config,
            Version = version
        };
    }

    public void Remove(string collection) => Index().Remove(collection);

    public void SetConventions(NamingConventions conventions) => Conventions = conventions;

    private Dictionary<string, PlanEntry> Index() =>
        _index ??= Entries.ToDictionary(e => e.Collection, StringComparer.OrdinalIgnoreCase);
}
