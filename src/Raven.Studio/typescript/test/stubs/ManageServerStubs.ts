import ClientConfiguration = Raven.Client.Documents.Operations.Configuration.ClientConfiguration;
import AnalyzerDefinition = Raven.Client.Documents.Indexes.Analysis.AnalyzerDefinition;
import SorterDefinition = Raven.Client.Documents.Queries.Sorting.SorterDefinition;

export class ManageServerStubs {
    static getSampleClientGlobalConfiguration(): ClientConfiguration {
        return {
            Disabled: false,
            Etag: 103,
            IdentityPartsSeparator: ".",
            MaxNumberOfRequestsPerSession: 32,
        };
    }

    static getSampleClientDatabaseConfiguration(): ClientConfiguration {
        return {
            Disabled: false,
            Etag: 132,
            IdentityPartsSeparator: ";",
            LoadBalanceBehavior: "UseSessionContext",
            ReadBalanceBehavior: "RoundRobin",
        };
    }

    static serverWideCustomAnalyzers(): AnalyzerDefinition[] {
        return [
            { Code: "server-analyzer-code-1", Name: "First Server analyzer" },
            { Code: "server-analyzer-code-2", Name: "Second Server analyzer" },
            { Code: "server-analyzer-code-3", Name: "Third Server analyzer" },
            { Code: "server-analyzer-code-4", Name: "Fourth Server analyzer" },
        ];
    }

    static serverWideCustomSorters(): SorterDefinition[] {
        return [
            { Code: "server-sorter-code-1", Name: "First Server sorter" },
            { Code: "server-sorter-code-2", Name: "Second Server sorter" },
            { Code: "server-sorter-code-3", Name: "Third Server sorter" },
            { Code: "server-sorter-code-4", Name: "Fourth Server sorter" },
        ];
    }

    static certificates(): CertificatesResponseDto {
        return {
            Certificates: [
                {
                    Name: "Server Certificate",
                    Thumbprint: "BCD2B71A3021A644E94768CCEFF7BE56E2006144",
                    SecurityClearance: "ClusterNode",
                    Permissions: {},
                    NotAfter: "2025-03-04T01:00:00.0000000",
                    NotBefore: "2024-11-27T01:00:00.0000000",
                    CollectionSecondaryKeys: [],
                    CollectionPrimaryKey: "",
                    PublicKeyPinningHash: "C9tJ80ex6C4VOZVE4PrCQmS7fha+0j/zl9VzhPrQb20=",
                },
                {
                    Name: "TEST",
                    Thumbprint: "A292B8B456F62CA7D09648E048DE7DE59933BA3B",
                    SecurityClearance: "ValidUser",
                    Permissions: {
                        PutUniqeValueToDifferentNode_1: "ReadWrite",
                    },
                    NotAfter: "2029-12-04T01:00:00.0000000",
                    NotBefore: "2024-11-27T01:00:00.0000000",
                    CollectionSecondaryKeys: [],
                    CollectionPrimaryKey: "",
                    PublicKeyPinningHash: "2LHF+V8cNKKPwRX6xdl+3wyYDfismyLPNPor6wbXPGc=",
                    HasTwoFactor: true,
                },
                {
                    Name: "client certificate",
                    Thumbprint: "BD72E6C57AA2C89DD83D9621D30A452342BF7D28",
                    SecurityClearance: "ClusterAdmin",
                    Permissions: {},
                    NotAfter: "2029-12-04T01:00:00.0000000",
                    NotBefore: "2024-11-27T01:00:00.0000000",
                    CollectionSecondaryKeys: [],
                    CollectionPrimaryKey: "",
                    PublicKeyPinningHash: "ah0d8H9Ntv0FPmKd8OkH53uzNAzC+9VWCVlthKQTZWU=",
                    HasTwoFactor: false,
                },
            ],
            LoadedServerCert: "BCD2B71A3021A644E94768CCEFF7BE56E2006144",
            WellKnownAdminCerts: null,
            WellKnownIssuers: [],
        };
    }
}
