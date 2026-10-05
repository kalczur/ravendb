using Raven.Client.Documents.Operations.CdcSink.Schema;
using Raven.Quill.AiHelper.Migration.Planning;

namespace Raven.Quill.AiHelper.Migration;

/// <summary>
/// The planning agent, behind its HTTP contract. <see cref="RemoteMigrationClient"/> posts these
/// commands to /assistant/migration/*, exactly as <see cref="AiHelperInternalClient"/> posts to
/// /assistant/assist, and the bundled server forwards them to api.ravendb.net.
/// </summary>
public interface IMigrationClient
{
    Task StartAsync(MigrationStartCommand command, Func<MigrationFrame, Task> onFrame, CancellationToken token);

    Task AskAsync(MigrationAskCommand command, Func<MigrationFrame, Task> onFrame, CancellationToken token);

    /// <summary>What a conversation has registered, or null when no such plan belongs to <paramref name="slug"/>.</summary>
    Task<IReadOnlyCollection<PlanEntry>?> GetAsync(string slug, string conversationId, CancellationToken token);
}

public sealed record MigrationStartCommand(
    string Slug,
    CdcSinkSourceSchema Schema,
    string Prompt);

public sealed record MigrationAskCommand(
    string Slug,
    string ConversationId,
    CdcSinkSourceSchema Schema,
    string Prompt);
