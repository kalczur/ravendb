namespace Raven.Server.Documents.ETL.Providers.RelationalDatabase.RelationalWriters;

public sealed class DbCommandBuilder
{
    public string Start, End;

    public string QuoteIdentifier(string unquotedIdentifier)
    {
        return Start + unquotedIdentifier + End;
    }
}
