import { Switch } from "components/common/Checkbox";
import {
    AccordionBody,
    AccordionHeader,
    AccordionItem,
    Form,
    FormGroup,
    Input,
    InputGroup,
    InputGroupText,
    Label,
} from "reactstrap";
import * as yup from "yup";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormInput } from "components/common/Form";
import ButtonWithSpinner from "components/common/ButtonWithSpinner";
import { tryHandleSubmit } from "components/utils/common";
import { useServices } from "components/hooks/useServices";

interface AdminLogsConfigLogsProps {
    targetId: string;
    config: Raven.Client.ServerWide.Operations.Logs.GetLogsConfigurationResult["Logs"];
    close: () => void;
    reloadConfig: () => void;
}

export default function AdminLogsConfigLogs({ targetId, config, reloadConfig }: AdminLogsConfigLogsProps) {
    const { control, formState, handleSubmit, reset } = useForm<FormData>({
        defaultValues: {
            minLevel: config.CurrentMinLevel,
            // filters: config.CurrentFilters,
            logFilterDefaultAction: config.CurrentLogFilterDefaultAction,
        },
    });

    const { manageServerService } = useServices();

    const handleSave: SubmitHandler<FormData> = (data) => {
        return tryHandleSubmit(async () => {
            await manageServerService.saveAdminLogsConfiguration({
                AdminLogs: {
                    Filters: [], //TODO
                    MinLevel: data.minLevel,
                    LogFilterDefaultAction: data.logFilterDefaultAction,
                },
            });

            reset(data);
            reloadConfig();
            close();
        });
    };

    return (
        <AccordionItem className="p-1 bg-black">
            <AccordionHeader targetId={targetId}>Logs</AccordionHeader>
            <AccordionBody accordionId={targetId}>
                <h5 className="text-center text-muted text-uppercase m-0">Writable</h5>
                <Form onSubmit={handleSubmit(handleSave)} key={targetId}>
                    <FormGroup>
                        <Label>Minimum log level</Label>
                        <FormInput control={control} name="minLevel" type="text" />
                    </FormGroup>
                    {/* <FormGroup>
                        <Label>Filters</Label>
                        <FormInput control={control} name="filters" type="text" />
                    </FormGroup> */}
                    <FormGroup>
                        <Label>Log Filter Default Action</Label>
                        <FormInput control={control} name="logFilterDefaultAction" type="text" />
                    </FormGroup>
                    <ButtonWithSpinner
                        color="success"
                        type="submit"
                        className="ms-auto"
                        icon="save"
                        isSpinning={formState.isSubmitting}
                    >
                        Save
                    </ButtonWithSpinner>
                </Form>
                <h5 className="text-center text-muted text-uppercase m-0">Read-only</h5>
                <FormGroup>
                    <Label>Path</Label>
                    <Input type="text" value={config.Path} readOnly />
                </FormGroup>
                <FormGroup>
                    <Label>Minimum Level</Label>
                    <Input type="text" value={config.MinLevel} readOnly />
                </FormGroup>
                <FormGroup>
                    <Label>Archive Above Size</Label>
                    <InputGroup>
                        <Input type="number" value={config.ArchiveAboveSizeInMb} readOnly />
                        <InputGroupText>MB</InputGroupText>
                    </InputGroup>
                </FormGroup>
                <FormGroup>
                    <Label>Maximum Archived Days</Label>
                    <Input type="number" value={config.MaxArchiveDays} readOnly />
                </FormGroup>
                <FormGroup>
                    <Label>Maximum Archived Files</Label>
                    <Input type="number" value={config.MaxArchiveFiles} readOnly />
                </FormGroup>
                <FormGroup className="d-grid">
                    <Label>Archive File Compression</Label>
                    <Switch readOnly selected={config.EnableArchiveFileCompression} toggleSelection={() => {}} />
                </FormGroup>
            </AccordionBody>
        </AccordionItem>
    );
}

const schema = yup.object({
    // TODO both to select
    minLevel: yup.string<Sparrow.Logging.LogLevel>().nullable().required(),
    logFilterDefaultAction: yup.string<Sparrow.Logging.LogFilterAction>().nullable().required(),
    // TODO
    // filters: yup.array().of(yup.string().nullable().required()),
});

type FormData = yup.InferType<typeof schema>;
