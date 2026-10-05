using Raven.Client.Documents.Operations.CdcSink.Schema;

namespace Raven.Quill.AiHelper.Migration.Planning;

/// <summary>
/// The table and column facts the Apply-time join-column check reads. Built from the discovered schema.
/// </summary>
public sealed class SchemaCatalog
{
    /// <summary>
    /// Columns are kept in the order the source declares them, which keeps the column list in a
    /// rejection stable.
    /// </summary>
    private sealed record TableEntry(string Schema, string Name)
    {
        public List<string> Columns { get; } = [];

        public HashSet<string> Lookup { get; } = new(StringComparer.OrdinalIgnoreCase);

        public string Qualified => string.IsNullOrEmpty(Schema) ? Name : $"{Schema}.{Name}";

        public void Add(string column)
        {
            if (Lookup.Add(column))
                Columns.Add(column);
        }
    }

    private readonly Dictionary<string, TableEntry> _byQualified = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, List<TableEntry>> _byBare = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Build from what discovery already found. No parser is involved: the indexed columns are the
    /// discovered columns.
    /// </summary>
    public static SchemaCatalog FromDiscoveredSchema(CdcSinkSourceSchema schema)
    {
        var catalog = new SchemaCatalog();

        foreach (var table in schema.Tables ?? [])
        {
            catalog.Add(
                table.SourceTableSchema ?? string.Empty,
                table.SourceTableName ?? string.Empty,
                (table.Columns ?? []).Select(c => c.Name).Where(n => string.IsNullOrWhiteSpace(n) == false).ToArray());
        }

        return catalog;
    }

    /// <summary>True when the name resolves to exactly one table. An ambiguous bare name does not.</summary>
    public bool Knows(string? table) => Resolve(table) is not null;

    public bool HasColumn(string? table, string? column) =>
        string.IsNullOrWhiteSpace(column) == false &&
        Resolve(table) is { } entry &&
        entry.Lookup.Contains(column.Trim());

    public IReadOnlyList<string> Columns(string? table) =>
        Resolve(table)?.Columns ?? (IReadOnlyList<string>)Array.Empty<string>();

    /// <summary>A bare table name declared under more than one schema. The caller must qualify it.</summary>
    public bool IsAmbiguous(string? table) =>
        table is not null &&
        Qualified(table) == false &&
        _byBare.TryGetValue(Bare(table), out var entries) &&
        entries.Count > 1;

    public IReadOnlyList<string> Candidates(string? table) =>
        table is not null && _byBare.TryGetValue(Bare(table), out var entries)
            ? entries.Select(e => e.Qualified).ToArray()
            : Array.Empty<string>();

    private TableEntry? Resolve(string? table)
    {
        if (string.IsNullOrWhiteSpace(table))
            return null;

        if (Qualified(table) && _byQualified.TryGetValue(Normalise(table), out var qualified))
            return qualified;

        if (_byBare.TryGetValue(Bare(table), out var entries) && entries.Count == 1)
            return entries[0];

        return null;
    }

    private void Add(string schema, string name, IReadOnlyCollection<string> columns)
    {
        if (string.IsNullOrWhiteSpace(name))
            return;

        var key = string.IsNullOrEmpty(schema) ? name : $"{schema}.{name}";

        if (_byQualified.TryGetValue(key, out var entry) == false)
        {
            entry = new TableEntry(schema, name);
            _byQualified[key] = entry;

            if (_byBare.TryGetValue(name, out var bare) == false)
                _byBare[name] = bare = new List<TableEntry>();

            bare.Add(entry);
        }

        foreach (var column in columns)
            entry.Add(column.Trim());
    }

    private static bool Qualified(string table) => table.Contains('.');

    private static string Normalise(string table) =>
        string.Join('.', table.Split('.', StringSplitOptions.RemoveEmptyEntries).Select(p => p.Trim()));

    private static string Bare(string table)
    {
        var name = table.Trim();
        var lastSeparator = name.LastIndexOf('.');

        return lastSeparator >= 0 ? name[(lastSeparator + 1)..].Trim() : name;
    }

}
