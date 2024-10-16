import { yupResolver } from "@hookform/resolvers/yup";
import ButtonWithSpinner from "components/common/ButtonWithSpinner";
import { FormSelect } from "components/common/Form";
import { Icon } from "components/common/Icon";
import { useServices } from "components/hooks/useServices";
import { allLogFilterActions, allLogLevels, tryHandleSubmit } from "components/utils/common";
import { SubmitHandler, useForm } from "react-hook-form";
import { CloseButton, Form, FormGroup, Label, Modal, ModalBody } from "reactstrap";
import * as yup from "yup";

interface AdminLogsViewSettingsModalProps {
    config: Raven.Client.ServerWide.Operations.Logs.GetLogsConfigurationResult["AdminLogs"];
    toggle: () => void;
    reloadConfig: () => void;
}

export default function AdminLogsViewSettingsModal({ config, toggle, reloadConfig }: AdminLogsViewSettingsModalProps) {
    const { control, handleSubmit, reset, formState } = useForm<FormData>({
        resolver: yupResolver(schema),
        defaultValues: {
            logFilterDefaultAction: config.CurrentLogFilterDefaultAction,
            minLevel: config.CurrentMinLevel,
            // filters: config.Filters, TODO
        },
    });

    const { manageServerService } = useServices();

    const handleSave: SubmitHandler<FormData> = (data) => {
        return tryHandleSubmit(async () => {
            await manageServerService.saveAdminLogsConfiguration({
                AdminLogs: {
                    LogFilterDefaultAction: data.logFilterDefaultAction,
                    MinLevel: data.minLevel,
                    Filters: [], // TODO
                },
            });

            reset(data);
            reloadConfig();
            toggle();
        });
    };

    return (
        <Modal isOpen wrapClassName="bs5" centered size="lg">
            <ModalBody>
                <div className="d-flex">
                    <h3>
                        <Icon icon="client" addon="settings" />
                        Settings - logs on this view
                    </h3>
                    <CloseButton className="ms-auto" onClick={toggle} />
                </div>

                <Form onSubmit={handleSubmit(handleSave)}>
                    <FormGroup>
                        <Label>Minimum log level</Label>
                        <FormSelect control={control} name="minLevel" options={levelOptions} />
                    </FormGroup>
                    <FormGroup>
                        <Label>Log Filter Default Action</Label>
                        <FormSelect control={control} name="logFilterDefaultAction" options={actionOptions} />
                    </FormGroup>
                    <ButtonWithSpinner
                        type="submit"
                        icon="save"
                        color="success"
                        isSpinning={formState.isSubmitting}
                        className="ms-auto"
                    >
                        Save
                    </ButtonWithSpinner>
                </Form>
            </ModalBody>
        </Modal>
    );
}

const levelOptions = allLogLevels.map((level) => ({ label: level, value: level }));
const actionOptions = allLogFilterActions.map((action) => ({ label: action, value: action }));

const schema = yup.object({
    // filters: yup.array().of(yup.string()),
    logFilterDefaultAction: yup.string<Sparrow.Logging.LogFilterAction>().required(),
    minLevel: yup.string<Sparrow.Logging.LogLevel>().required(),
});

type FormData = yup.InferType<typeof schema>;
