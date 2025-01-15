﻿using System;
using System.IO;
using System.Linq;
using System.Text;
using Raven.Client.Util;
using Sparrow.Json.Parsing;

namespace Raven.Client.ServerWide.Operations.Migration
{
    public sealed class OfflineMigrationConfiguration
    {
        private const string StorageExporterExecutable = "Raven.StorageExporter.exe";
        private const string EsentDBDataFile = "Data";
        private const string EsentFSDataFile = "Data.ravenfs";
        private const string VoronDataFile = "Raven.voron";
        private const string VoronBackupFile = "RavenDB.Voron.Backup";
        private const string EsentBackupFile = "RavenDB.Backup";

        private OfflineMigrationConfiguration()
        {
            // for deserialization
        }

        public OfflineMigrationConfiguration(string dataDirectory, string dataExporterFullPath, DatabaseRecord databaseRecord)
        {
            DataDirectory = dataDirectory;
            DataExporterFullPath = dataExporterFullPath;
            DatabaseRecord = databaseRecord;
        }

        public string DataDirectory { get; set; }
        public string OutputFilePath { get; set; }
        public string DataExporterFullPath { get; set; }
        public int? BatchSize { get; set; }
        public bool IsRavenFs { get; set; }
        public bool IsCompressed { get; set; }
        public string JournalsPath { get; set; }
        public int? LogFileSize { get; set; }
        public int? MaxVerPages { get; set; }
        public string EncryptionKey { get; set; }
        public string EncryptionAlgorithm { get; set; }
        public int? EncryptionKeyBitsSize { get; set; }
        public TimeSpan? Timeout { get; set; }
        public DatabaseRecord DatabaseRecord { get; set; }

        internal void Validate()
        {
            if (string.IsNullOrWhiteSpace(DataDirectory))
                throw new ArgumentNullException(nameof(DataDirectory));

            if (string.IsNullOrWhiteSpace(DataExporterFullPath))
                throw new ArgumentNullException(nameof(DataExporterFullPath));

            if (DatabaseRecord == null)
                throw new ArgumentNullException(nameof(DatabaseRecord));

            if (string.IsNullOrWhiteSpace(DatabaseRecord.DatabaseName))
                throw new ArgumentNullException(nameof(DatabaseRecord.DatabaseName));
        }

        internal static string EffectiveDataExporterFullPath(string fullPath)
        {
            var path = fullPath.Trim('"');
            if (Directory.Exists(path))
            {
                // looks like user provided dir instead of full path
                // try to add executable name
                return Path.Combine(path, StorageExporterExecutable);
            }

            //otherwise return what we have
            return path;
        }

        internal static void ValidateDataDirectory(string dataDirectory)
        {
            if (Directory.Exists(dataDirectory) == false)
                throw new DirectoryNotFoundException($"Could not find directory {dataDirectory}");

            var esentDataDbFile = Path.Combine(dataDirectory, EsentDBDataFile);
            var esentDataFsFile = Path.Combine(dataDirectory, EsentFSDataFile);
            var voronDataFile = Path.Combine(dataDirectory, VoronDataFile);
            var voronBackupFile = Path.Combine(dataDirectory, VoronBackupFile);
            var esentBackupFile = Path.Combine(dataDirectory, EsentBackupFile);
            if (!File.Exists(esentDataDbFile) && !File.Exists(esentDataFsFile) && !File.Exists(voronDataFile) && File.Exists(voronBackupFile) == false && File.Exists(esentBackupFile) == false)
                throw new FileNotFoundException($"Data directory should contain file '{EsentDBDataFile}', '{EsentFSDataFile}' or '{VoronDataFile}' or '{VoronBackupFile}' or '{EsentBackupFile}'");
        }

        internal static void ValidateExporterPath(string dataExporterPath)
        {
            var effectivePath = EffectiveDataExporterFullPath(dataExporterPath);

            if (File.Exists(effectivePath) == false)
                throw new FileNotFoundException($"Could not find file {StorageExporterExecutable} at given location");
        }

        internal (string Commandline, string TmpFile) GenerateExporterCommandLine()
        {
            Validate();

            string tmpFile = null;
            var sb = new StringBuilder();

            if (OutputFilePath == null)
            {
                var rempDir = Path.GetTempPath();

                OutputFilePath = tmpFile = Path.Combine(rempDir, $"export-{DatabaseRecord.DatabaseName}-{SystemTime.UtcNow:yyyyMMdd_HHmmss}.ravendump");
            }

            sb.Append($"{EnsureStringsAreQuoted(DataDirectory)} {EnsureStringsAreQuoted(OutputFilePath)}");

            if (BatchSize.HasValue)
            {
                sb.Append($" -BatchSize {BatchSize.Value}");
            }

            if (IsRavenFs)
            {
                sb.Append(" --RavenFS");
            }

            if (IsCompressed)
            {
                sb.Append(" --Compression");
            }

            if (string.IsNullOrEmpty(JournalsPath) == false)
            {
                sb.Append($" -JournalsPath {EnsureStringsAreQuoted(JournalsPath)}");
            }

            if (LogFileSize.HasValue)
            {
                sb.Append($" -LogFileSize {LogFileSize.Value}");
            }

            if (MaxVerPages.HasValue)
            {
                sb.Append($" -MaxVerPages {MaxVerPages.Value}");
            }

            if (string.IsNullOrEmpty(EncryptionKey) == false && string.IsNullOrEmpty(EncryptionAlgorithm) == false && EncryptionKeyBitsSize.HasValue)
            {
                sb.Append($" -Encryption {EnsureStringsAreQuoted(EncryptionKey)} {EnsureStringsAreQuoted(EncryptionAlgorithm)} {EncryptionKeyBitsSize.Value}");
            }

            return (sb.ToString(), tmpFile);

            string EnsureStringsAreQuoted(string path)
            {
                //The path is already quoted
                if (path.First() == '\"' && path.Last() == '\"')
                    return path;
                return $"\"{path}\"";
            }
        }
        
        public DynamicJsonValue ToAuditJson() =>
            new()
            {
                [nameof(DataDirectory)] = DataDirectory,
                [nameof(OutputFilePath)] = OutputFilePath,
                [nameof(DataExporterFullPath)] = DataExporterFullPath,
                [nameof(BatchSize)] = BatchSize,
                [nameof(IsRavenFs)] = IsRavenFs,
                [nameof(IsCompressed)] = IsCompressed,
                [nameof(JournalsPath)] = JournalsPath,
                [nameof(LogFileSize)] = LogFileSize,
                [nameof(MaxVerPages)] = MaxVerPages,
                [nameof(EncryptionAlgorithm)] = EncryptionAlgorithm,
                [nameof(Timeout)] = Timeout
            };
    }
}
