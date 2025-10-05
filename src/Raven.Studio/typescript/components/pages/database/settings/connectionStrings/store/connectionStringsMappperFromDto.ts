import { Connection, ConnectionStringUsedTask, RavenConnection } from "../connectionStringsTypes";

type OngoingTaskForConnection = Raven.Client.Documents.Operations.OngoingTasks.OngoingTask & {
    ConnectionStringName?: string;
    BrokerType?: Raven.Client.Documents.Operations.ETL.Queue.QueueBrokerType;
};

export abstract class connectionStringsMappperFromDto {
    constructor(
        readonly dto: GetConnectionStringsResult,
        readonly ongoingTasks: OngoingTaskForConnection[]
    ) {}

    abstract map(): Connection[];
    abstract getConnectionSpecificTasks(): OngoingTaskForConnection[];

    getUsedTasks(connectionName: string): ConnectionStringUsedTask[] {
        const filteredTasks = this.getConnectionSpecificTasks().filter(
            (task) => task.ConnectionStringName === connectionName
        );

        return filteredTasks.map(
            (x) =>
                ({
                    id: x.TaskId,
                    name: x.TaskName,
                }) satisfies ConnectionStringUsedTask
        );
    }
}

export class ravenConnectionStringMapperFromDto extends connectionStringsMappperFromDto {
    constructor(...args: ConstructorParameters<typeof connectionStringsMappperFromDto>) {
        super(...args);
    }

    map() {
        return Object.values(this.dto.RavenConnectionStrings).map(
            (connection) =>
                ({
                    type: "Raven",
                    name: connection.Name,
                    database: connection.Database,
                    topologyDiscoveryUrls: connection.TopologyDiscoveryUrls.map((x) => ({ url: x })),
                    usedByTasks: this.getUsedTasks(connection.Name),
                }) satisfies RavenConnection
        );
    }

    getConnectionSpecificTasks() {
        return this.ongoingTasks.filter((task) =>
            ["RavenEtl", "Replication", "PullReplicationAsSink"].includes(task.TaskType)
        );
    }
}
