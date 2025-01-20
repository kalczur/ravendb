import ManageServerService from "components/services/ManageServerService";
import { AutoMockService, MockedValue } from "./AutoMockService";
import ClientConfiguration = Raven.Client.Documents.Operations.Configuration.ClientConfiguration;
import { ManageServerStubs } from "test/stubs/ManageServerStubs";
import AnalyzerDefinition = Raven.Client.Documents.Indexes.Analysis.AnalyzerDefinition;
import SorterDefinition = Raven.Client.Documents.Queries.Sorting.SorterDefinition;
import { SharedStubs } from "test/stubs/SharedStubs";

export default class MockManageServerService extends AutoMockService<ManageServerService> {
    constructor() {
        super(new ManageServerService());
    }

    withGetGlobalClientConfiguration(dto?: MockedValue<ClientConfiguration>) {
        return this.mockResolvedValue(
            this.mocks.getGlobalClientConfiguration,
            dto,
            ManageServerStubs.getSampleClientGlobalConfiguration()
        );
    }

    withThrowingGetGlobalClientConfiguration() {
        this.mocks.getGlobalClientConfiguration.mockRejectedValue(new Error());
    }

    withGetDatabaseClientConfiguration(dto?: MockedValue<ClientConfiguration>) {
        return this.mockResolvedValue(
            this.mocks.getClientConfiguration,
            dto,
            ManageServerStubs.getSampleClientDatabaseConfiguration()
        );
    }

    withServerWideCustomAnalyzers(dto?: MockedValue<AnalyzerDefinition[]>) {
        return this.mockResolvedValue(
            this.mocks.getServerWideCustomAnalyzers,
            dto,
            ManageServerStubs.serverWideCustomAnalyzers()
        );
    }

    withThrowingGetServerWideCustomAnalyzers() {
        this.mocks.getServerWideCustomAnalyzers.mockRejectedValue(new Error());
    }

    withServerWideCustomSorters(dto?: MockedValue<SorterDefinition[]>) {
        return this.mockResolvedValue(
            this.mocks.getServerWideCustomSorters,
            dto,
            ManageServerStubs.serverWideCustomSorters()
        );
    }

    withThrowingGetServerWideCustomSorters() {
        this.mocks.getServerWideCustomSorters.mockRejectedValue(new Error());
    }

    withTestPeriodicBackupCredentials(dto?: Raven.Server.Web.System.NodeConnectionTestResult) {
        return this.mockResolvedValue(
            this.mocks.testPeriodicBackupCredentials,
            dto,
            SharedStubs.nodeConnectionTestSuccessResult()
        );
    }

    withCertificates(dto?: MockedValue<CertificatesResponseDto>) {
        return this.mockResolvedValue(this.mocks.getCertificates, dto, ManageServerStubs.certificates());
    }

    withAdminStats(dto?: MockedValue<Raven.Server.ServerWide.ServerStatistics>) {
        return this.mockResolvedValue(this.mocks.getAdminStats, dto, ManageServerStubs.adminStats());
    }

    withServerCertificateRenewalDate(dto?: MockedValue<string>) {
        return this.mockResolvedValue(
            this.mocks.getServerCertificateRenewalDate,
            dto,
            ManageServerStubs.serverCertificateRenewalDate()
        );
    }

    withServerCertificateSetupMode(dto?: MockedValue<Raven.Server.Commercial.SetupMode>) {
        return this.mockResolvedValue(
            this.mocks.getServerCertificateSetupMode,
            dto,
            ManageServerStubs.serverCertificateSetupMode()
        );
    }
}
