import React, { useEffect } from "react";
import { Form, Col, Button, Card, Row, Spinner, InputGroup, InputGroupText } from "reactstrap";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormCheckbox, FormInput, FormSelect, FormSwitch } from "components/common/Form";
import {
    ClientConfigurationFormData,
    clientConfigurationYupResolver,
} from "../../../../common/clientConfiguration/ClientConfigurationValidation";
import { useServices } from "components/hooks/useServices";
import { useAsyncCallback } from "react-async-hook";
import { LoadingView } from "components/common/LoadingView";
import { LoadError } from "components/common/LoadError";
import ClientConfigurationUtils from "components/common/clientConfiguration/ClientConfigurationUtils";
import useClientConfigurationFormController from "components/common/clientConfiguration/useClientConfigurationFormController";
import { tryHandleSubmit } from "components/utils/common";
import { Icon } from "components/common/Icon";
import { PopoverWithHover } from "components/common/PopoverWithHover";
import useClientConfigurationPopovers from "components/common/clientConfiguration/useClientConfigurationPopovers";
import { useDirtyFlag } from "components/hooks/useDirtyFlag";
import { AboutViewAnchored, AboutViewHeading, AccordionItemWrapper } from "components/common/AboutView";
import { useAppSelector } from "components/store";
import { licenseSelectors } from "components/common/shell/licenseSlice";
import { useRavenLink } from "components/hooks/useRavenLink";
import FeatureAvailabilitySummaryWrapper from "components/common/FeatureAvailabilitySummary";
import { featureAvailabilityProfessionalOrAbove } from "components/utils/licenseLimitsUtils";

export default function ClientGlobalConfiguration() {
    const { manageServerService } = useServices();
    const asyncGetGlobalClientConfiguration = useAsyncCallback(manageServerService.getGlobalClientConfiguration);

    const { handleSubmit, control, formState, setValue, reset } = useForm<ClientConfigurationFormData>({
        resolver: clientConfigurationYupResolver,
        mode: "all",
        defaultValues: async () =>
            ClientConfigurationUtils.mapToFormData(await asyncGetGlobalClientConfiguration.execute(), true),
    });

    const loadBalancingDocsLink = useRavenLink({ hash: "GYJ8JA" });
    const clientConfigurationDocsLink = useRavenLink({ hash: "TS7SGF" });

    const popovers = useClientConfigurationPopovers();
    const formValues = useClientConfigurationFormController(control, setValue, true);

    useEffect(() => {
        if (formState.isSubmitSuccessful) {
            reset(formValues);
        }
    }, [formState.isSubmitSuccessful, reset, formValues]);

    useDirtyFlag(formState.isDirty);

    const isProfessionalOrAbove = useAppSelector(licenseSelectors.isProfessionalOrAbove());

    const onSave: SubmitHandler<ClientConfigurationFormData> = async (formData) => {
        return tryHandleSubmit(async () => {
            await manageServerService.saveGlobalClientConfiguration(ClientConfigurationUtils.mapToDto(formData, true));
        });
    };

    const onRefresh = async () => {
        reset(ClientConfigurationUtils.mapToFormData(await asyncGetGlobalClientConfiguration.execute(), true));
    };

    if (asyncGetGlobalClientConfiguration.loading) {
        return <LoadingView />;
    }

    if (asyncGetGlobalClientConfiguration.error) {
        return <LoadError error="Unable to load client global configuration" refresh={onRefresh} />;
    }

    return (
        <Form onSubmit={handleSubmit(onSave)} autoComplete="off">
            <div className="content-margin">
                <Row className="gy-sm">
                    <Col>
                        <AboutViewHeading
                            icon="database-client-configuration"
                            title="Client Configuration"
                            badgeText={isProfessionalOrAbove ? null : "Professional +"}
                        />
                        <Button type="submit" color="primary" disabled={formState.isSubmitting || !formState.isDirty}>
                            {formState.isSubmitting ? <Spinner size="sm" className="me-1" /> : <Icon icon="save" />}
                            Save
                        </Button>
                        <div className={isProfessionalOrAbove ? "" : "item-disabled pe-none"}>
                            <Card className="card flex-column p-3 my-3">
                                <div className="d-flex flex-grow-1">
                                    <div className="md-label">
                                        Identity parts separator{" "}
                                        <i ref={popovers.setIdentityPartsSeparator} className="icon-info text-info" />
                                    </div>
                                    <PopoverWithHover target={popovers.identityPartsSeparator} placement="right">
                                        <div className="flex-horizontal p-3">
                                            <div>
                                                Set the default separator for automatically generated document identity
                                                IDs.
                                                <br />
                                                Use any character except <code>&apos;|&apos;</code> (pipe).
                                            </div>
                                        </div>
                                    </PopoverWithHover>
                                </div>
                                <Row className="flex-grow-1">
                                    <Col className="d-flex">
                                        <InputGroup>
                                            <InputGroupText>
                                                <FormCheckbox control={control} name="identityPartsSeparatorEnabled" />
                                            </InputGroupText>
                                            <FormInput
                                                type="text"
                                                control={control}
                                                name="identityPartsSeparatorValue"
                                                placeholder="'/' (default)"
                                                disabled={!formValues.identityPartsSeparatorEnabled}
                                                className="d-flex"
                                            />
                                        </InputGroup>
                                    </Col>
                                </Row>
                            </Card>

                            <Card className="flex-column mt-1 mb-3 p-3">
                                <div className="d-flex flex-grow-1">
                                    <div className="md-label">
                                        Maximum number of requests per session{" "}
                                        <i
                                            ref={popovers.setMaximumRequestsPerSession}
                                            className="icon-info text-info"
                                        />
                                    </div>
                                    <PopoverWithHover target={popovers.maximumRequestsPerSession} placement="right">
                                        <div className="flex-horizontal p-3">
                                            <div>
                                                Set this number to restrict the number of requests (<code>Reads</code> &{" "}
                                                <code>Writes</code>) per session in the client API.
                                            </div>
                                        </div>
                                    </PopoverWithHover>
                                </div>
                                <Row className="flex-grow-1">
                                    <Col className="d-flex">
                                        <InputGroup>
                                            <InputGroupText>
                                                <FormCheckbox control={control} name="maximumNumberOfRequestsEnabled" />
                                            </InputGroupText>
                                            <FormInput
                                                type="number"
                                                control={control}
                                                name="maximumNumberOfRequestsValue"
                                                placeholder="30 (default)"
                                                disabled={!formValues.maximumNumberOfRequestsEnabled}
                                            />
                                        </InputGroup>
                                    </Col>
                                </Row>
                            </Card>
                            <div className="d-flex justify-content-between mt-4 position-relative">
                                <h4>Load Balancing Client Requests</h4>
                                <small title="Navigate to the documentation" className="position-absolute end-0">
                                    <a href={loadBalancingDocsLink} target="_blank">
                                        <Icon icon="link" /> Load balancing tutorial
                                    </a>
                                </small>
                            </div>
                            <Card className="flex-column mt-1 p-3">
                                <div className="d-flex flex-grow-1">
                                    <div className="md-label">
                                        Load Balance Behavior{" "}
                                        <i ref={popovers.setSessionContext} className="icon-info text-info" />
                                        <PopoverWithHover target={popovers.sessionContext} placement="right">
                                            <div className="flex-horizontal p-3">
                                                <div>
                                                    Set the Load balance method for <strong>Read</strong> &{" "}
                                                    <strong>Write</strong> requests
                                                    <br />
                                                    <ul>
                                                        <li>
                                                            <code>None</code>
                                                            <br />
                                                            <strong>Read</strong> requests - the node the client will
                                                            target will be based on Read balance behavior configuration.
                                                            <br />
                                                            <strong>Write</strong> requests - will be sent to the
                                                            preferred node.
                                                        </li>
                                                        <br />
                                                        <li>
                                                            <code>Use session context</code>
                                                            <br />
                                                            Sessions that are assigned the same context will have all
                                                            their <strong>Read & Write</strong> requests routed to the
                                                            same node.
                                                            <br />
                                                            The session context is hashed from a context string (given
                                                            by the client) and an optional seed.
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </PopoverWithHover>
                                    </div>
                                </div>
                                <Row className="mb-4">
                                    <Col className="d-flex align-items-center gap-3">
                                        <InputGroup className="d-flex flex-grow">
                                            <InputGroupText>
                                                <FormCheckbox control={control} name="loadBalancerEnabled" />
                                            </InputGroupText>
                                            <FormSelect
                                                control={control}
                                                name="loadBalancerValue"
                                                disabled={!formValues.loadBalancerEnabled}
                                                options={ClientConfigurationUtils.getLoadBalanceBehaviorOptions()}
                                            />
                                        </InputGroup>
                                    </Col>
                                </Row>
                                {formValues.loadBalancerValue === "UseSessionContext" && (
                                    <>
                                        <div className="d-flex flex-grow-1"></div>
                                        <Row className="mb-4">
                                            <Col className="d-flex align-items-center gap-3">
                                                <FormSwitch
                                                    control={control}
                                                    name="loadBalancerSeedEnabled"
                                                    color="primary"
                                                    label="Seed"
                                                    className="small"
                                                >
                                                    Seed
                                                    <i
                                                        ref={popovers.setLoadBalanceSeedBehavior}
                                                        className="icon-info text-info margin-left-xxs"
                                                    />
                                                    <PopoverWithHover
                                                        target={popovers.loadBalanceSeedBehavior}
                                                        placement="right"
                                                    >
                                                        <div className="flex-horizontal p-3">
                                                            <div>
                                                                An optional seed number.
                                                                <br />
                                                                Used when hashing the session context.
                                                            </div>
                                                        </div>
                                                    </PopoverWithHover>
                                                </FormSwitch>
                                                <InputGroup>
                                                    <FormInput
                                                        type="number"
                                                        control={control}
                                                        name="loadBalancerSeedValue"
                                                        placeholder="0 (default)"
                                                        disabled={!formValues.loadBalancerSeedEnabled}
                                                    />
                                                </InputGroup>
                                            </Col>
                                        </Row>
                                    </>
                                )}
                                <div className="d-flex flex-grow-1">
                                    <div className="md-label">
                                        Read Balance Behavior{" "}
                                        <i ref={popovers.setReadBalanceBehavior} className="icon-info text-info" />
                                        <PopoverWithHover target={popovers.readBalanceBehavior} placement="right">
                                            <div className="flex-horizontal p-3">
                                                <div>
                                                    Set the Read balance method the client will use when accessing a
                                                    node with <strong>Read</strong> requests.
                                                    <br />
                                                    <strong>Write</strong> requests are sent to the preferred node.
                                                </div>
                                            </div>
                                        </PopoverWithHover>
                                    </div>
                                </div>
                                <Row>
                                    <Col className="d-flex">
                                        <InputGroup>
                                            <InputGroupText>
                                                <FormCheckbox control={control} name="readBalanceBehaviorEnabled" />
                                            </InputGroupText>
                                            <FormSelect
                                                control={control}
                                                name="readBalanceBehaviorValue"
                                                disabled={!formValues.readBalanceBehaviorEnabled}
                                                options={ClientConfigurationUtils.getReadBalanceBehaviorOptions()}
                                            />
                                        </InputGroup>
                                    </Col>
                                </Row>
                            </Card>
                        </div>
                    </Col>
                    <Col sm={12} md={4}>
                        <AboutViewAnchored defaultOpen={isProfessionalOrAbove ? null : "licensing"}>
                            <AccordionItemWrapper
                                icon="about"
                                color="info"
                                heading="About this view"
                                description="Get additional info on this feature"
                                targetId="1"
                            >
                                <ul>
                                    <li className="margin-bottom-xs">
                                        This is the <strong>Server-wide Client-Configuration</strong> view.
                                        <br />
                                        The available Client-Configuration options will apply to any client that
                                        communicates with any database in the cluster.
                                    </li>
                                    <li>
                                        These values can be customized per database in the{" "}
                                        <strong>Database Client-Configuration</strong> view.
                                    </li>
                                </ul>
                                <hr />
                                <ul>
                                    <li className="margin-bottom-xs">
                                        Setting the Client-Configuration on the server from this view will{" "}
                                        <strong>override</strong> the client&apos;s existing settings, which were
                                        initially set by your client code.
                                    </li>
                                    <li className="margin-bottom-xs">
                                        When the server&apos;s Client-Configuration is modified, the running client will
                                        receive the updated settings the next time it makes a request to the server.
                                    </li>
                                    <li>
                                        This enables administrators to{" "}
                                        <strong>dynamically control the client behavior</strong> even after it has
                                        started running. E.g. manage load balancing of client requests on the fly in
                                        response to changing system demands.
                                    </li>
                                </ul>
                                <hr />
                                <div className="small-label mb-2">useful links</div>
                                <a href={clientConfigurationDocsLink} target="_blank">
                                    <Icon icon="newtab" /> Docs - Client Configuration
                                </a>
                            </AccordionItemWrapper>
                            <FeatureAvailabilitySummaryWrapper
                                isUnlimited={isProfessionalOrAbove}
                                data={featureAvailabilityProfessionalOrAbove}
                            />
                        </AboutViewAnchored>
                    </Col>
                </Row>
            </div>
        </Form>
    );
}
