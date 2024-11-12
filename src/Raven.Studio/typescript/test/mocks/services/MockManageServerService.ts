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

    withAdminLogsConfiguration(dto?: MockedValue<Raven.Client.ServerWide.Operations.Logs.GetLogsConfigurationResult>) {
        return this.mockResolvedValue(
            this.mocks.getAdminLogsConfiguration,
            dto,
            ManageServerStubs.adminLogsConfiguration()
        );
    }

    withEventListenerConfiguration(
        dto?: MockedValue<Omit<Raven.Server.EventListener.EventListenerToLog.EventListenerConfiguration, "Persist">>
    ) {
        return this.mockResolvedValue(
            this.mocks.getEventListenerConfiguration,
            dto,
            ManageServerStubs.eventListenerConfiguration()
        );
    }

    withTrafficWatchConfiguration(
        dto?: MockedValue<
            Omit<
                Raven.Client.ServerWide.Operations.TrafficWatch.PutTrafficWatchConfigurationOperation.Parameters,
                "Persist"
            >
        >
    ) {
        return this.mockResolvedValue(
            this.mocks.getTrafficWatchConfiguration,
            dto,
            ManageServerStubs.trafficWatchConfiguration()
        );
    }
}
