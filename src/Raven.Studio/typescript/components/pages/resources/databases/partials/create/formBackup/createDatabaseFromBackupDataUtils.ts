import { CreateDatabaseFromBackupFormData as FormData } from "./createDatabaseFromBackupValidation";
import assertUnreachable from "components/utils/assertUnreachable";
type RestoreBackupConfigurationBase = Raven.Client.Documents.Operations.Backups.RestoreBackupConfigurationBase;
type S3Settings = Raven.Client.Documents.Operations.Backups.S3Settings;
type AzureSettings = Raven.Client.Documents.Operations.Backups.AzureSettings;
type GoogleCloudSettings = Raven.Client.Documents.Operations.Backups.GoogleCloudSettings;
type BackupEncryptionSettings = Raven.Client.Documents.Operations.Backups.BackupEncryptionSettings;
type RestoreType = Raven.Client.Documents.Operations.Backups.RestoreType;

const defaultRestorePoints: FormData["sourceStep"]["sourceData"][restoreSource]["restorePoints"] = [
    {
        restorePoint: null,
        nodeTag: "",
    },
];

const defaultValues: FormData = {
    basicInfoStep: {
        databaseName: "",
        isSharded: false,
    },
    sourceStep: {
        isDisableOngoingTasksAfterRestore: false,
        isSkipIndexes: false,
        isEncrypted: false,
        sourceType: null,
        sourceData: {
            local: {
                directory: "",
                restorePoints: defaultRestorePoints,
            },
            cloud: {
                link: "",
                restorePoints: defaultRestorePoints,
                encryptionKey: "",
                awsSettings: null,
            },
            amazonS3: {
                isUseCustomHost: false,
                isForcePathStyle: false,
                customHost: "",
                accessKey: "",
                secretKey: "",
                awsRegion: "",
                bucketName: "",
                remoteFolderName: "",
                restorePoints: defaultRestorePoints,
            },
            azure: {
                accountKey: "",
                accountName: "",
                container: "",
                remoteFolderName: "",
                restorePoints: defaultRestorePoints,
            },
            googleCloud: {
                bucketName: "",
                credentialsJson: "",
                remoteFolderName: "",
                restorePoints: defaultRestorePoints,
            },
        },
    },
    encryptionStep: {
        isKeySaved: false,
        key: "",
    },
    dataDirectoryStep: {
        isDefault: true,
        directory: "",
    },
};

function getRestoreDtoType(sourceType: restoreSource): RestoreType {
    switch (sourceType) {
        case "local":
            return "Local";
        case "cloud": // raven cloud stores backups only on S3
        case "amazonS3":
            return "S3";
        case "azure":
            return "Azure";
        case "googleCloud":
            return "GoogleCloud";
        default:
            assertUnreachable(sourceType);
    }
}

// TODO maybe refactor? this is copy-paste from 5.4
function getEncryptionDto(
    selectedSourceData: FormData["sourceStep"]["sourceData"][restoreSource],
    encryptionDataIsEncrypted: boolean,
    encryptionDataKey: string
): Pick<RestoreBackupConfigurationBase, "EncryptionKey" | "BackupEncryptionSettings"> {
    let encryptionSettings: BackupEncryptionSettings = null;
    let databaseEncryptionKey = null;

    const restorePoint = selectedSourceData.restorePoints[0].restorePoint;

    if (restorePoint.isEncrypted) {
        if (restorePoint.isSnapshotRestore) {
            if (encryptionDataIsEncrypted) {
                encryptionSettings = {
                    EncryptionMode: "UseDatabaseKey",
                    Key: null,
                };
                databaseEncryptionKey = selectedSourceData.encryptionKey;
            }
        } else {
            // backup of type backup
            encryptionSettings = {
                EncryptionMode: "UseProvidedKey",
                Key: selectedSourceData.encryptionKey,
            };

            if (encryptionDataIsEncrypted) {
                databaseEncryptionKey = encryptionDataKey;
            }
        }
    } else {
        // backup is not encrypted
        if (!restorePoint.isSnapshotRestore && encryptionDataIsEncrypted) {
            databaseEncryptionKey = encryptionDataKey;
        }
    }

    return {
        BackupEncryptionSettings: encryptionSettings,
        EncryptionKey: databaseEncryptionKey,
    };
}

type SelectedSourceDto = Pick<
    CreateDatabaseFromBackupDto,
    "LastFileNameToRestore" | "ShardRestoreSettings" | "BackupEncryptionSettings" | "EncryptionKey"
>;

function getSelectedSourceDto(
    isSharded: boolean,
    selectedSourceData: FormData["sourceStep"]["sourceData"][restoreSource],
    encryptionDataIsEncrypted: boolean,
    encryptionDataKey: string
): SelectedSourceDto {
    const encryptionDto = getEncryptionDto(selectedSourceData, encryptionDataIsEncrypted, encryptionDataKey);

    const dto: SelectedSourceDto = {
        ...encryptionDto,
    };

    if (isSharded) {
        dto["LastFileNameToRestore"] = null;
        dto["ShardRestoreSettings"] = {
            Shards: Object.fromEntries(
                selectedSourceData.restorePoints.map((restorePoint, index) => [
                    index,
                    {
                        FolderName: restorePoint.restorePoint.location,
                        LastFileNameToRestore: restorePoint.restorePoint.fileName,
                        NodeTag: restorePoint.nodeTag,
                        ShardNumber: index,
                    },
                ])
            ),
        };
    } else {
        dto["LastFileNameToRestore"] = selectedSourceData.restorePoints[0].restorePoint.fileName;
        dto["ShardRestoreSettings"] = null;
    }

    return dto;
}

function getSourceDto(
    sourceStep: FormData["sourceStep"],
    isSharded: boolean,
    encryptionDataIsEncrypted: boolean,
    encryptionDataKey: string
): SelectedSourceDto & Pick<CreateDatabaseFromBackupDto, "BackupLocation" | "Settings"> {
    switch (sourceStep.sourceType) {
        case "local": {
            const data = sourceStep.sourceData.local;

            return {
                ...getSelectedSourceDto(isSharded, data, encryptionDataIsEncrypted, encryptionDataKey),
                BackupLocation: isSharded ? null : data.restorePoints[0].restorePoint.location,
            };
        }
        case "cloud": {
            const data = sourceStep.sourceData.cloud;

            return {
                ...getSelectedSourceDto(isSharded, data, encryptionDataIsEncrypted, encryptionDataKey),
                Settings: {
                    AwsAccessKey: data.awsSettings.accessKey,
                    AwsSecretKey: data.awsSettings.secretKey,
                    AwsRegionName: data.awsSettings.regionName,
                    BucketName: data.awsSettings.bucketName,
                    AwsSessionToken: data.awsSettings.sessionToken,
                    RemoteFolderName: data.awsSettings.remoteFolderName,
                    Disabled: false,
                    CustomServerUrl: null,
                    ForcePathStyle: false,
                    GetBackupConfigurationScript: null,
                } satisfies S3Settings,
            };
        }
        case "amazonS3": {
            const data = sourceStep.sourceData.amazonS3;

            return {
                ...getSelectedSourceDto(isSharded, data, encryptionDataIsEncrypted, encryptionDataKey),
                Settings: {
                    AwsAccessKey: _.trim(data.accessKey),
                    AwsSecretKey: _.trim(data.secretKey),
                    AwsRegionName: _.trim(data.awsRegion),
                    BucketName: _.trim(data.bucketName),
                    AwsSessionToken: "",
                    RemoteFolderName: _.trim(data.remoteFolderName),
                    Disabled: false,
                    GetBackupConfigurationScript: null,
                    CustomServerUrl: data.isUseCustomHost ? _.trim(data.customHost) : null,
                    ForcePathStyle: data.isUseCustomHost && data.isForcePathStyle,
                } satisfies S3Settings,
            };
        }
        case "azure": {
            const data = sourceStep.sourceData.azure;

            return {
                ...getSelectedSourceDto(isSharded, data, encryptionDataIsEncrypted, encryptionDataKey),
                Settings: {
                    AccountKey: _.trim(data.accountKey),
                    SasToken: "",
                    AccountName: _.trim(data.accountName),
                    StorageContainer: _.trim(data.container),
                    RemoteFolderName: _.trim(data.remoteFolderName),
                    Disabled: false,
                    GetBackupConfigurationScript: null,
                } satisfies AzureSettings,
            };
        }

        case "googleCloud": {
            const data = sourceStep.sourceData.googleCloud;

            return {
                ...getSelectedSourceDto(isSharded, data, encryptionDataIsEncrypted, encryptionDataKey),
                Settings: {
                    BucketName: _.trim(data.bucketName),
                    GoogleCredentialsJson: _.trim(data.credentialsJson),
                    RemoteFolderName: _.trim(data.remoteFolderName),
                    Disabled: false,
                    GetBackupConfigurationScript: null,
                } satisfies GoogleCloudSettings,
            };
        }
        default:
            assertUnreachable(sourceStep.sourceType);
    }
}

export type CreateDatabaseFromBackupDto = Partial<RestoreBackupConfigurationBase> & {
    Type: RestoreType;
} & {
    BackupLocation?: string;
    Settings?: S3Settings | AzureSettings | GoogleCloudSettings;
};

function mapToDto({
    basicInfoStep,
    sourceStep,
    encryptionStep,
    dataDirectoryStep,
}: FormData): CreateDatabaseFromBackupDto {
    return {
        ...getSourceDto(sourceStep, basicInfoStep.isSharded, sourceStep.isEncrypted, encryptionStep.key),
        Type: getRestoreDtoType(sourceStep.sourceType),
        DatabaseName: basicInfoStep.databaseName,
        DisableOngoingTasks: sourceStep.isDisableOngoingTasksAfterRestore,
        SkipIndexes: sourceStep.isSkipIndexes,
        DataDirectory: dataDirectoryStep.isDefault ? null : _.trim(dataDirectoryStep.directory),
    };
}

export const createDatabaseFromBackupDataUtils = {
    defaultValues,
    mapToDto,
};
