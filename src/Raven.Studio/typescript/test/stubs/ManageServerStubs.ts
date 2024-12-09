import moment from "moment";
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
                    Thumbprint: "0E719C75B5899C07FCEF270B58B1FF153069677A",
                    SecurityClearance: "ClusterNode",
                    Permissions: {},
                    NotAfter: moment()
                        .add(5 as const, "years")
                        .format(),
                    NotBefore: moment()
                        .add(-10 as const, "days")
                        .format(),
                    CollectionSecondaryKeys: [],
                    CollectionPrimaryKey: "",
                    PublicKeyPinningHash: "SEZWHsvbycEsXVNFnj7a3Ou6r1B2xVmPQMhlmgw/NJc=",
                },
                {
                    Name: "Valid cert",
                    Thumbprint: "0F61904E1926ED2EDD5BB4BA8BC34742960B7839",
                    SecurityClearance: "ClusterAdmin",
                    Permissions: {},
                    NotAfter: moment()
                        .add(2 as const, "years")
                        .format(),
                    NotBefore: moment()
                        .add(-10 as const, "days")
                        .format(),
                    CollectionSecondaryKeys: [],
                    CollectionPrimaryKey: "",
                    PublicKeyPinningHash: "hyaqn9MDYitTWCf+oGwvu+GG9xqyxzZoZLANt5F/BL4=",
                    HasTwoFactor: false,
                },
                {
                    Name: "About to expire cert",
                    Thumbprint: "05576326B5A2EC2CC59B4CDBFE51243ADC56187B",
                    SecurityClearance: "ValidUser",
                    Permissions: {
                        db2: "Read",
                        db1: "ReadWrite",
                    },
                    NotAfter: moment()
                        .add(5 as const, "days")
                        .format(),
                    NotBefore: moment()
                        .add(-10 as const, "days")
                        .format(),
                    CollectionSecondaryKeys: [],
                    CollectionPrimaryKey: "",
                    PublicKeyPinningHash: "FXoY7RVRnzcM8+m9ofo7IM5FnZp5SeDxHUOL74uzr+g=",
                    HasTwoFactor: true,
                },
                {
                    Name: "Expired cert",
                    Thumbprint: "6C19B1CD3171F10C55A7CC58E4E993D8524332B1",
                    SecurityClearance: "Operator",
                    Permissions: {},
                    NotAfter: moment()
                        .add(-5 as const, "days")
                        .format(),
                    NotBefore: moment()
                        .add(-10 as const, "days")
                        .format(),
                    CollectionSecondaryKeys: [],
                    CollectionPrimaryKey: "",
                    PublicKeyPinningHash: "tYDktnF7XEos5gOGMC4t4eBi5MDSAHDpFqX1rV9oLCE=",
                    HasTwoFactor: false,
                },
            ],
            LoadedServerCert: "BCD2B71A3021A644E94768CCEFF7BE56E2006144",
            WellKnownAdminCerts: null,
            WellKnownIssuers: [],
        };
    }

    static adminStats(): Raven.Server.ServerWide.ServerStatistics {
        return {
            LastRequestTime: moment().format(),
            LastAuthorizedNonClusterAdminRequestTime: null,
            LastRequestTimePerCertificate: {
                "0E719C75B5899C07FCEF270B58B1FF153069677A": moment()
                    .add(-2 as const, "hours")
                    .format(),
                "0F61904E1926ED2EDD5BB4BA8BC34742960B7839": moment()
                    .add(-2 as const, "minutes")
                    .format(),
            },
        };
    }
}
