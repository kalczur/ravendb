import React from "react";
import { todo } from "common/developmentHelper";
import { FormSelect } from "components/common/Form";
import {
    OptionWithIcon,
    SingleValueWithIcon,
    SelectOption,
    SelectOptionWithIcon,
} from "components/common/select/Select";
import { components } from "react-select";
import { Icon } from "components/common/Icon";
import { GroupHeadingProps, OptionProps } from "react-select";
import { Row, Button, Col } from "reactstrap";
import { CreateDatabaseFromBackupFormData as FormData, RestorePoint } from "../../createDatabaseFromBackupValidation";
import { FieldPath, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { clusterSelectors } from "components/common/shell/clusterSlice";
import { useAppSelector } from "components/store";
import { success } from "toastr";

interface GroupedOption {
    label: string;
    options: SelectOption<RestorePoint>[];
}

interface CreateDatabaseFromBackupRestorePointProps {
    index: number;
    restorePointsOptions: GroupedOption[];
    isLoading?: boolean;
}

export default function CreateDatabaseFromBackupRestorePoint({
    index,
    restorePointsOptions,
    isLoading,
}: CreateDatabaseFromBackupRestorePointProps) {
    const { control, formState } = useFormContext<FormData>();
    const {
        basicInfoStep: { isSharded },
        sourceStep: { sourceType },
    } = useWatch({
        control,
    });

    const fieldName = `sourceStep.sourceData.${sourceType}.pointsWithTags` satisfies FieldPath<FormData>;

    const { remove } = useFieldArray({
        control,
        name: fieldName,
    });

    const allNodeTags = useAppSelector(clusterSelectors.allNodeTags);
    const nodeTagOptions = getNodeTagOptions(allNodeTags);

    const flatOptionsCount = restorePointsOptions.reduce((acc, curr) => acc + curr.options.length, 0);

    const restorePointPlaceholder = `Select restore point ${
        isLoading ? "" : `(${flatOptionsCount} ${flatOptionsCount === 1 ? "option" : "options"})`
    }`;

    return (
        <div className={isSharded && "bg-faded-shard p-1 rounded-1 mb-2"}>
            <Row className="gx-xs gy-xs">
                {isSharded && (
                    <>
                        <Col xs="3" sm="3" lg="1" className="align-self-center order-1">
                            <div className="d-flex justify-content-between">
                                <div className="text-shard">
                                    <Icon icon="shard" margin="m-0" /> <strong>#{index}</strong>
                                </div>
                            </div>
                        </Col>
                        <Col xs="7" sm="7" lg="2" className="order-2">
                            <FormSelect
                                control={control}
                                name={`${fieldName}.${index}.nodeTag`}
                                options={nodeTagOptions}
                                placeholder={<Icon icon="node" color="node" />}
                                isSearchable={false}
                                components={{
                                    Option: OptionWithIcon,
                                    SingleValue: SingleValueWithIcon,
                                }}
                            />
                        </Col>
                    </>
                )}
                <Col className="order-3">
                    <FormSelect
                        control={control}
                        name={`${fieldName}.${index}.restorePoint`}
                        placeholder={restorePointPlaceholder}
                        options={restorePointsOptions}
                        components={{
                            GroupHeading: RestorePointGroupHeading,
                            Option: RestorePointOption,
                        }}
                        isLoading={isLoading}
                        isDisabled={isLoading || flatOptionsCount === 0 || formState.isSubmitting}
                    />
                </Col>
                {isSharded && (
                    <Col sm="2" xs="2" lg="1" className="align-self-center order-2 order-lg-4 text-end">
                        {index > 0 && (
                            <Button outline color="danger" onClick={() => remove(index)}>
                                <Icon icon="trash" margin="m-0" />
                            </Button>
                        )}
                    </Col>
                )}
            </Row>
        </div>
    );
}

function getNodeTagOptions(allNodeTags: string[]): SelectOptionWithIcon[] {
    if (allNodeTags?.length > 0) {
        return allNodeTags.map((tag) => ({
            value: tag,
            label: tag,
            icon: "node",
            iconColor: "node",
        }));
    }

    return [
        {
            value: "?",
            label: "?",
            icon: "node",
            iconColor: "node",
        },
    ];
}

const RestorePointGroupHeading = (props: GroupHeadingProps<SelectOption<RestorePoint>>) => {
    return (
        <>
            <div className="bg-faded-secondary px-4 pt-2   pb-0">
                <h4 className="m-0 text-muted">
                    <Icon icon="database" /> {props.data.label}
                </h4>
            </div>
            <div className="p-1 position-sticky top-0 bg-faded-secondary z-1">
                <Row className="d-flex align-items-center text-center gx-xs">
                    <Col lg="3" className="lh-1">
                        <small className="small-label">BACKUP TYPE</small>
                    </Col>
                    <Col lg="3" className="lh-1">
                        <small className="small-label">ENCRYPTED</small>
                    </Col>
                    <Col lg="3" className="lh-1">
                        <small className="small-label">NODE TAG</small>
                    </Col>
                    <Col lg="3" className="lh-1">
                        <small className="small-label">FILES TO RESTORE</small>
                    </Col>
                </Row>
            </div>
        </>
    );
};

function RestorePointOption(props: OptionProps<SelectOption<RestorePoint>>) {
    const { data } = props;

    return (
        <components.Option {...props}>
            <Row className="gx-xs">
                <Col xs="12" sm="12" className="">
                    <div className="px-3">
                        <Icon icon="clock" />
                        <strong>{data.value.dateTime}</strong>
                    </div>
                </Col>
                <Col lg="3" className="text-center">
                    <small className={data.value.backupType == "Full" ? "text-success" : "text-emphasis"}>
                        {data.value.backupType}
                    </small>
                </Col>
                <Col lg="3" className="text-center">
                    <small>
                        {data.value.isEncrypted ? <Icon icon="lock" color="success" /> : <Icon icon="unsecure" />}
                    </small>
                </Col>
                <Col lg="3" className="text-center">
                    <small>{data.value.nodeTag}</small>
                </Col>
                <Col lg="3" className="text-center">
                    <small>{data.value.filesToRestore}</small>
                </Col>
            </Row>
        </components.Option>
    );
}
