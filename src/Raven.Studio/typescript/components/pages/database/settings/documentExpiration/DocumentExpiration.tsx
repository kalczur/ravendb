import React, { useEffect } from "react";
import { Alert, Card, CardBody, Col, Form, Row } from "reactstrap";
import { AboutViewAnchored, AboutViewHeading, AccordionItemWrapper } from "components/common/AboutView";
import { Icon } from "components/common/Icon";
import { FormInput, FormSwitch } from "components/common/Form";
import { SubmitHandler, useForm, useWatch } from "react-hook-form";
import ButtonWithSpinner from "components/common/ButtonWithSpinner";
import { useDirtyFlag } from "components/hooks/useDirtyFlag";
import { tryHandleSubmit } from "components/utils/common";
import { DocumentExpirationFormData, documentExpirationYupResolver } from "./DocumentExpirationValidation";
import { useEventsCollector } from "components/hooks/useEventsCollector";
import { useServices } from "components/hooks/useServices";
import messagePublisher from "common/messagePublisher";
import { LoadingView } from "components/common/LoadingView";
import { LoadError } from "components/common/LoadError";
import Code from "components/common/Code";
import { NonShardedViewProps } from "components/models/common";
import { useAsyncCallback } from "react-async-hook";
import ServerExpirationConfiguration = Raven.Client.Documents.Operations.Expiration.ExpirationConfiguration;
import { useAppSelector } from "components/store";
import { licenseSelectors } from "components/common/shell/licenseSlice";
import { useRavenLink } from "components/hooks/useRavenLink";
import FeatureAvailabilitySummaryWrapper, {
    FeatureAvailabilityData,
} from "components/common/FeatureAvailabilitySummary";

export default function DocumentExpiration({ db }: NonShardedViewProps) {
    const { databasesService } = useServices();

    const asyncGetExpirationConfiguration = useAsyncCallback<DocumentExpirationFormData>(async () =>
        mapToFormData(await databasesService.getExpirationConfiguration(db))
    );

    const { handleSubmit, control, formState, reset, setValue } = useForm<DocumentExpirationFormData>({
        resolver: documentExpirationYupResolver,
        mode: "all",
        defaultValues: asyncGetExpirationConfiguration.execute,
    });

    useDirtyFlag(formState.isDirty);
    const formValues = useWatch({ control: control });
    const { reportEvent } = useEventsCollector();

    const documentExpirationDocsLink = useRavenLink({ hash: "XBFEKZ" });

    const isProfessionalOrAbove = useAppSelector(licenseSelectors.isProfessionalOrAbove());
    const frequencyLimit = 129600;

    useEffect(() => {
        if (!formValues.isDeleteFrequencyEnabled && formValues.deleteFrequency !== null) {
            setValue("deleteFrequency", null, { shouldValidate: true });
        }
        if (!formValues.isDocumentExpirationEnabled && formValues.isDeleteFrequencyEnabled) {
            setValue("isDeleteFrequencyEnabled", false, { shouldValidate: true });
        }
    }, [
        formValues.isDocumentExpirationEnabled,
        formValues.isDeleteFrequencyEnabled,
        formValues.deleteFrequency,
        setValue,
    ]);

    const onSave: SubmitHandler<DocumentExpirationFormData> = async (formData) => {
        return tryHandleSubmit(async () => {
            reportEvent("expiration-configuration", "save");

            await databasesService.saveExpirationConfiguration(db, {
                Disabled: !formData.isDocumentExpirationEnabled,
                DeleteFrequencyInSec: formData.isDeleteFrequencyEnabled ? formData.deleteFrequency : null,
            });

            messagePublisher.reportSuccess("Expiration configuration saved successfully");
            db.hasExpirationConfiguration(formData.isDocumentExpirationEnabled);

            reset(formData);
        });
    };

    if (
        asyncGetExpirationConfiguration.status === "not-requested" ||
        asyncGetExpirationConfiguration.status === "loading"
    ) {
        return <LoadingView />;
    }

    if (asyncGetExpirationConfiguration.status === "error") {
        return (
            <LoadError error="Unable to load document expiration" refresh={asyncGetExpirationConfiguration.execute} />
        );
    }

    return (
        <div className="content-margin">
            <Col xxl={12}>
                <Row className="gy-sm">
                    <Col>
                        <Form onSubmit={handleSubmit(onSave)} autoComplete="off">
                            <AboutViewHeading title="Document Expiration" icon="document-expiration" />
                            <ButtonWithSpinner
                                type="submit"
                                color="primary"
                                className="mb-3"
                                icon="save"
                                disabled={
                                    !formState.isDirty ||
                                    (!isProfessionalOrAbove &&
                                        formValues.isDeleteFrequencyEnabled &&
                                        formValues.deleteFrequency < frequencyLimit)
                                }
                                isSpinning={formState.isSubmitting}
                            >
                                Save
                            </ButtonWithSpinner>
                            <Col>
                                <Card>
                                    <CardBody>
                                        <div className="vstack gap-2">
                                            <FormSwitch name="isDocumentExpirationEnabled" control={control}>
                                                Enable Document Expiration
                                            </FormSwitch>
                                            <div>
                                                <FormSwitch
                                                    name="isDeleteFrequencyEnabled"
                                                    control={control}
                                                    className="mb-3"
                                                    disabled={
                                                        formState.isSubmitting ||
                                                        !formValues.isDocumentExpirationEnabled
                                                    }
                                                >
                                                    Set custom expiration frequency
                                                </FormSwitch>
                                                <FormInput
                                                    name="deleteFrequency"
                                                    control={control}
                                                    type="number"
                                                    disabled={
                                                        formState.isSubmitting || !formValues.isDeleteFrequencyEnabled
                                                    }
                                                    placeholder={
                                                        isProfessionalOrAbove ? "Default (60)" : "Default (129600)"
                                                    }
                                                    addonText="seconds"
                                                />
                                                {!isProfessionalOrAbove &&
                                                    formValues.isDeleteFrequencyEnabled &&
                                                    formValues.deleteFrequency < frequencyLimit && (
                                                        <Alert color="warning" className="mt-3">
                                                            <Icon icon="warning" /> Your current license does not allow
                                                            a frequency higher than 36 hours (129600 seconds)
                                                        </Alert>
                                                    )}
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>
                            </Col>
                        </Form>
                    </Col>
                    <Col sm={12} lg={4}>
                        <AboutViewAnchored defaultOpen={isProfessionalOrAbove ? null : "licensing"}>
                            <AccordionItemWrapper
                                targetId="1"
                                icon="about"
                                color="info"
                                description="Get additional info on this feature"
                                heading="About this view"
                            >
                                <p>
                                    When <strong>Document Expiration</strong> is enabled:
                                </p>
                                <ul>
                                    <li>
                                        The server scans the database at the specified <strong>frequency</strong>,
                                        searching for documents that should be deleted.
                                    </li>
                                    <li>
                                        Any document that has an <code>@expires</code> metadata property whose time has
                                        passed at the time of the scan will be removed.
                                    </li>
                                </ul>

                                <p>Sample document:</p>
                                <Code code={codeExample} language="javascript" />
                                <hr />
                                <div className="small-label mb-2">useful links</div>
                                <a href={documentExpirationDocsLink} target="_blank">
                                    <Icon icon="newtab" /> Docs - Document Expiration
                                </a>
                            </AccordionItemWrapper>
                            <FeatureAvailabilitySummaryWrapper
                                isUnlimited={isProfessionalOrAbove}
                                data={featureAvailability}
                            />
                        </AboutViewAnchored>
                    </Col>
                </Row>
            </Col>
        </div>
    );
}

function mapToFormData(dto: ServerExpirationConfiguration): DocumentExpirationFormData {
    if (!dto) {
        return {
            isDocumentExpirationEnabled: false,
            isDeleteFrequencyEnabled: false,
            deleteFrequency: null,
        };
    }

    return {
        isDocumentExpirationEnabled: !dto.Disabled,
        isDeleteFrequencyEnabled: dto.DeleteFrequencyInSec != null,
        deleteFrequency: dto.DeleteFrequencyInSec,
    };
}

const codeExample = `{
    "Example": 
      "Set a timestamp in the @expires metadata property",
    "@metadata": {
      "@collection": "Foo",
      "@expires": "2023-07-16T08:00:00.0000000Z"
    }
}`;

export const featureAvailability: FeatureAvailabilityData[] = [
    {
        featureName: "Expiration frequency limit (hours)",
        community: { value: 36 },
        professional: { value: Infinity },
        enterprise: { value: Infinity },
    },
];
