import { Icon } from "components/common/Icon";
import React from "react";
import { Row, Col, Collapse, UncontrolledPopover, PopoverBody, Label } from "reactstrap";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { CreateDatabaseFromBackupFormData as FormData } from "../../createDatabaseFromBackupValidation";
import { FormInput, FormSelectAutocomplete, FormSwitch } from "components/common/Form";
import { useServices } from "components/hooks/useServices";
import CreateDatabaseFromBackupRestorePoint from "components/pages/resources/databases/partials/create/formBackup/steps/source/RestorePointField";
import { restorePointUtils } from "components/pages/resources/databases/partials/create/formBackup/steps/source/restorePointUtils";
import { useAsyncDebounce } from "components/utils/hooks/useAsyncDebounce";
import { availableS3Regions } from "components/utils/common";
import EncryptionField from "components/pages/resources/databases/partials/create/formBackup/steps/source/EncryptionField";
import RestorePointsFields from "components/pages/resources/databases/partials/create/formBackup/steps/source/RestorePointsFields";

export default function BackupSourceAmazonS3() {
    const { control } = useFormContext<FormData>();

    const {
        basicInfoStep: { isSharded },
        sourceStep: {
            sourceData: { amazonS3: amazonS3Data },
        },
    } = useWatch({
        control,
    });

    return (
        <div className="mt-2">
            <Row>
                <Col lg={{ offset: 3 }}>
                    <FormSwitch control={control} name="sourceStep.sourceData.amazonS3.isUseCustomHost" color="primary">
                        Use a custom S3 host
                    </FormSwitch>
                </Col>
            </Row>

            <Collapse isOpen={amazonS3Data.isUseCustomHost}>
                <Row>
                    <Col lg={{ offset: 3 }}>
                        <FormSwitch
                            color="primary"
                            control={control}
                            name="sourceStep.sourceData.amazonS3.isForcePathStyle"
                        >
                            Force path style <Icon icon="info" color="info" id="CloudBackupLinkInfo" margin="m-0" />
                        </FormSwitch>
                        <UncontrolledPopover target="CloudBackupLinkInfo" trigger="hover">
                            <PopoverBody>
                                Whether to force path style URLs for S3 objects (e.g.,{" "}
                                <code>https://&#123;Server-URL&#125;/&#123;Bucket-Name&#125;</code> instead of{" "}
                                <code>https://&#123;Bucket-Name&#125;.&#123;Server-URL&#125;</code>)
                            </PopoverBody>
                        </UncontrolledPopover>
                    </Col>
                </Row>
                <Row className="mt-2">
                    <Col lg="3">
                        <Label className="col-form-label">Custom server URL</Label>
                    </Col>
                    <Col>
                        <FormInput
                            type="text"
                            control={control}
                            name="sourceStep.sourceData.amazonS3.customHost"
                            placeholder="Enter custom server URL"
                        />
                    </Col>
                </Row>
            </Collapse>

            <Row className="mt-2">
                <Col lg="3">
                    <Label className="col-form-label" check>
                        Access key
                    </Label>
                </Col>
                <Col>
                    <FormInput
                        type="text"
                        control={control}
                        name="sourceStep.sourceData.amazonS3.accessKey"
                        placeholder="Enter access key"
                    />
                </Col>
            </Row>
            <Row className="mt-2">
                <Col lg="3">
                    <Label className="col-form-label" aria-required>
                        Secret key
                    </Label>
                </Col>
                <Col>
                    <FormInput
                        control={control}
                        name="sourceStep.sourceData.amazonS3.secretKey"
                        placeholder="Enter secret key"
                        type="password"
                        passwordPreview
                    />
                </Col>
            </Row>
            <Row className="mt-2">
                <Col lg="3">
                    <Label className="col-form-label">
                        Aws Region
                        <br />
                        {amazonS3Data.isUseCustomHost && <small>(optional)</small>}
                    </Label>
                </Col>
                <Col>
                    {amazonS3Data.isUseCustomHost ? (
                        <FormInput
                            type="text"
                            control={control}
                            name="sourceStep.sourceData.amazonS3.awsRegion"
                            placeholder="Enter an AWS region"
                            autoComplete="off"
                        />
                    ) : (
                        <FormSelectAutocomplete
                            name="sourceStep.sourceData.amazonS3.awsRegion"
                            control={control}
                            placeholder="Select an AWS region (or enter new one)"
                            options={availableS3Regions}
                        />
                    )}
                </Col>
            </Row>
            <Row className="mt-2">
                <Col lg="3">
                    <Label className="col-form-label">Bucket Name</Label>
                </Col>
                <Col>
                    <FormInput
                        type="text"
                        control={control}
                        name="sourceStep.sourceData.amazonS3.bucketName"
                        placeholder="Enter bucket name"
                    />
                </Col>
            </Row>
            <Row className="mt-2">
                <Col lg="3">
                    <Label className="col-form-label">
                        Remote Folder Name
                        <br />
                        <small>(optional)</small>
                    </Label>
                </Col>
                <Col>
                    <FormInput
                        type="text"
                        control={control}
                        name="sourceStep.sourceData.amazonS3.remoteFolderName"
                        placeholder="Enter remote folder name"
                    />
                </Col>
            </Row>
            <RestorePointsFields
                isSharded={isSharded}
                pointsWithTagsFieldName="sourceStep.sourceData.amazonS3.pointsWithTags"
                mapRestorePoint={(field, index) => (
                    <SourceRestorePoint
                        key={field.id}
                        index={index}
                        isSharded={isSharded}
                        amazonS3Data={amazonS3Data}
                    />
                )}
            />
            <EncryptionField
                encryptionKeyFieldName="sourceStep.sourceData.amazonS3.encryptionKey"
                selectedSourceData={amazonS3Data}
            />
        </div>
    );
}

interface SourceRestorePointProps {
    index: number;
    isSharded: boolean;
    amazonS3Data: FormData["sourceStep"]["sourceData"]["amazonS3"];
}

function SourceRestorePoint({ index, isSharded, amazonS3Data }: SourceRestorePointProps) {
    const { resourcesService } = useServices();

    const { control } = useFormContext<FormData>();
    const { remove } = useFieldArray({
        control,
        name: "sourceStep.sourceData.amazonS3.pointsWithTags",
    });

    const asyncGetRestorePointsOptions = useAsyncDebounce(
        async (
            accessKey,
            secretKey,
            awsRegion,
            bucketName,
            remoteFolderName,
            isUseCustomHost,
            customHost,
            isForcePathStyle,
            isSharded
        ) => {
            const dto = await resourcesService.getRestorePoints_S3Backup(
                {
                    AwsAccessKey: _.trim(accessKey),
                    AwsSecretKey: _.trim(secretKey),
                    AwsRegionName: _.trim(awsRegion),
                    BucketName: _.trim(bucketName),
                    RemoteFolderName: _.trim(remoteFolderName),
                    AwsSessionToken: "",
                    CustomServerUrl: isUseCustomHost ? _.trim(customHost) : null,
                    ForcePathStyle: isUseCustomHost && isForcePathStyle,
                    Disabled: false,
                    GetBackupConfigurationScript: null,
                },
                true,
                isSharded ? index : undefined
            );
            return restorePointUtils.mapToSelectOptions(dto);
        },
        [
            amazonS3Data.accessKey,
            amazonS3Data.secretKey,
            amazonS3Data.awsRegion,
            amazonS3Data.bucketName,
            amazonS3Data.remoteFolderName,
            amazonS3Data.isUseCustomHost,
            amazonS3Data.customHost,
            amazonS3Data.isForcePathStyle,
            isSharded,
        ]
    );

    return (
        <CreateDatabaseFromBackupRestorePoint
            fieldName="sourceStep.sourceData.amazonS3.pointsWithTags"
            index={index}
            remove={remove}
            restorePointsOptions={asyncGetRestorePointsOptions.result ?? []}
            isLoading={asyncGetRestorePointsOptions.loading}
        />
    );
}
