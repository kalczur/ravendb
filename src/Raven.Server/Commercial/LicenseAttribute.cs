﻿namespace Raven.Server.Commercial;

public enum LicenseAttribute
{
    Type,
    Version,
    Expiration,
    Memory,
    Cores,
    Redist,
    Encryption,
    Snmp,
    DistributedCluster,
    MaxClusterSize,
    SnapshotBackup,
    CloudBackup,
    DynamicNodesDistribution,
    ExternalReplication,
    DelayedExternalReplication,
    RavenEtl,
    SqlEtl,
    HighlyAvailableTasks,
    PullReplicationHub,
    PullReplicationSink,
    EncryptedBackup,
    LetsEncryptAutoRenewal,
    Cloud,
    DocumentsCompression,
    TimeSeriesRollupsAndRetention,
    AdditionalAssembliesNuget,
    MonitoringEndpoints,
    OlapEtl,
    ReadOnlyCertificates,
    TcpDataCompression,
    ConcurrentSubscriptions,
    ElasticSearchEtl,
    PowerBI,
    PostgreSqlIntegration,
    CanBeActivatedUntil,
    QueueEtl,
    ServerWideBackups,
    ServerWideExternalReplications,
    ServerWideCustomSorters,
    ServerWideAnalyzers,
    IndexCleanup,
    PeriodicBackup,
    ClientConfiguration,
    StudioConfiguration,
    QueueSink,
    DataArchival,
    RevisionsInSubscriptions,
    MultiNodeSharding,
    SetupDefaultRevisionsConfiguration,
    MaxCoresPerNode,
    MaxNumberOfRevisionsToKeep,
    MaxNumberOfRevisionAgeToKeepInDays,
    MinPeriodForExpirationInHours,
    MinPeriodForRefreshInHours,
    MaxReplicationFactorForSharding,
    MaxNumberOfStaticIndexesPerDatabase,
    MaxNumberOfStaticIndexesPerCluster,
    MaxNumberOfAutoIndexesPerDatabase,
    MaxNumberOfAutoIndexesPerCluster,
    MaxNumberOfSubscriptionsPerDatabase,
    MaxNumberOfSubscriptionsPerCluster,
    MaxNumberOfCustomSortersPerDatabase,
    MaxNumberOfCustomSortersPerCluster,
    MaxNumberOfCustomAnalyzersPerDatabase,
    MaxNumberOfCustomAnalyzersPerCluster,
    SubscriptionExpiration,
    SnowflakeEtl,
}
