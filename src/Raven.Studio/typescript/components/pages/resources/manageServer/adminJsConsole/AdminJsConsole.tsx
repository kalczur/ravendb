import React from "react";
import { Card, Alert, CardHeader, CardBody, Row, Col, Button, Form, Spinner } from "reactstrap";
import { Icon } from "components/common/Icon";
import AboutView from "components/common/AboutView";
import AceEditor from "components/common/AceEditor";
import { todo } from "common/developmentHelper";
import { SubmitHandler, useForm } from "react-hook-form";
import { tryHandleSubmit } from "components/utils/common";
import { AdminJsConsoleFormData, adminJsConsoleYupResolver } from "./AdminJsConsoleValidation";
import { useServices } from "components/hooks/useServices";
import { useEventsCollector } from "components/hooks/useEventsCollector";
import { useAsyncCallback } from "react-async-hook";
import { FormAceEditor, FormSelect } from "components/common/Form";
import { useAppSelector } from "components/store";
import { databaseSelectors } from "components/common/shell/databaseSliceSelectors";
import { SelectOption } from "components/common/Select";
import { useDirtyFlag } from "components/hooks/useDirtyFlag";
import "./AdminJsConsole.scss";

const serverTargetValue = "Server";

export default function AdminJSConsole() {
    todo("Feature", "Damian", "issue: RavenDB-7588");

    const { manageServerService } = useServices();
    const { reportEvent } = useEventsCollector();
    const asyncRunAdminJsScript = useAsyncCallback(manageServerService.runAdminJsScript);
    const allDatabaseNames = useAppSelector(databaseSelectors.allDatabaseNames);

    const allTargets: SelectOption<string>[] = [
        { value: serverTargetValue, label: "Server", icon: "server", horizontalSeparatorLine: true },
        ...allDatabaseNames.map((x) => ({ value: x, label: x, icon: "database" } satisfies SelectOption<string>)),
    ];

    const { handleSubmit, control, reset, formState } = useForm<AdminJsConsoleFormData>({
        resolver: adminJsConsoleYupResolver,
        mode: "all",
        defaultValues: {
            target: allTargets[0].value,
            scriptText: "",
        },
    });

    useDirtyFlag(formState.isDirty);

    const onSave: SubmitHandler<AdminJsConsoleFormData> = async (formData) => {
        reportEvent("console", "execute");
        tryHandleSubmit(async () => {
            const databaseTarget = formData.target !== serverTargetValue ? formData.target : undefined;

            todo("Sharding", "Damian", "pass location");
            await asyncRunAdminJsScript.execute(formData.scriptText, databaseTarget);

            reset(formData);
        });
    };

    return (
        <div className="content-margin">
            <Row>
                <Col xxl={9}>
                    <Row>
                        <Col>
                            <h2>
                                <Icon icon="administrator-js-console" /> Admin JS Console
                            </h2>
                        </Col>
                        <Col sm={"auto"}>
                            <AboutView>
                                <Row>
                                    <Col sm={"auto"}>
                                        <Icon
                                            className="fs-1"
                                            icon="administrator-js-console"
                                            color="info"
                                            margin="m-0"
                                        />
                                    </Col>
                                    <Col>
                                        <p>
                                            <strong>Admin JS Console</strong> is a specialized feature primarily
                                            intended for resolving server errors. It provides a direct interface to the
                                            underlying system, granting the capacity to execute scripts for intricate
                                            server operations.
                                        </p>
                                        <p>
                                            It is predominantly intended for advanced troubleshooting and rectification
                                            procedures executed by system administrators or RavenDB support.
                                        </p>
                                        <hr />
                                        <div className="small-label mb-2">useful links</div>
                                        <a href="https://ravendb.net/l/IBUJ7M/6.0/Csharp">
                                            <Icon icon="newtab" /> Docs - Admin JS Console
                                        </a>
                                    </Col>
                                </Row>
                            </AboutView>
                        </Col>
                    </Row>

                    <Alert color="warning hstack gap-4">
                        <div className="flex-shrink-0">
                            <Icon icon="warning" /> WARNING
                        </div>
                        <div>
                            Do not use the console unless you are sure about what you&apos;re doing. Running a script in
                            the Admin Console could cause your server to crash, cause loss of data, or other
                            irreversible harm.
                        </div>
                    </Alert>

                    <Form onSubmit={handleSubmit(onSave)} autoComplete="off">
                        <Card>
                            <CardHeader className="hstack gap-4">
                                <h3 className="m-0">Script target</h3>
                                <FormSelect control={control} name="target" options={allTargets} />
                                <div className="text-info">
                                    Accessible within the script under <code>server</code> variable
                                </div>
                            </CardHeader>
                            <CardBody>
                                <div className="admin-js-console-grid">
                                    <div>
                                        <h3>Script</h3>
                                    </div>
                                    <FormAceEditor
                                        control={control}
                                        name="scriptText"
                                        mode="javascript"
                                        height="200px"
                                    />

                                    {/* TODO: @kalczur create component */}
                                    {/* TODO: @kalczur implement run on control + enter */}
                                    <div className="run-script-button">
                                        <Button
                                            color="primary"
                                            size="lg"
                                            className="px-4 py-2"
                                            disabled={!formState.isDirty || asyncRunAdminJsScript.status === "loading"}
                                        >
                                            {asyncRunAdminJsScript.status === "loading" ? (
                                                <Spinner />
                                            ) : (
                                                <Icon icon="play" className="fs-1 d-inline-block" margin="mb-2" />
                                            )}
                                            <div className="kbd">
                                                <kbd>ctrl</kbd> <strong>+</strong> <kbd>enter</kbd>
                                            </div>
                                        </Button>
                                    </div>
                                    <div>
                                        <h3>Script result</h3>
                                    </div>
                                    <AceEditor
                                        mode="javascript"
                                        readOnly
                                        value={JSON.stringify(asyncRunAdminJsScript.result?.Result)}
                                        height="300px"
                                    />
                                </div>
                            </CardBody>
                        </Card>
                    </Form>
                </Col>
            </Row>
        </div>
    );
}
