import {
    AccordionItem,
    AccordionBody,
    FormGroup,
    Label,
    Input,
    InputGroup,
    InputGroupText,
    AccordionHeader,
} from "reactstrap";

interface AdminLogsConfigAuditLogsProps {
    targetId: string;
    config: Raven.Client.ServerWide.Operations.Logs.GetLogsConfigurationResult["AuditLogs"];
}

export default function AdminLogsConfigAuditLogs({ targetId, config }: AdminLogsConfigAuditLogsProps) {
    return (
        <AccordionItem className="p-1 bg-black">
            <AccordionHeader targetId={targetId}>Audit Logs</AccordionHeader>
            <AccordionBody accordionId={targetId}>
                <h5 className="text-center text-muted text-uppercase m-0">Read-only</h5>
                <FormGroup>
                    <Label>Path</Label>
                    <Input type="text" value={config.Path} readOnly />
                </FormGroup>
                <FormGroup>
                    <Label>Level</Label>
                    <Input type="text" value={config.Level} readOnly />
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
                <FormGroup>
                    <Label>Archive File Compression</Label>
                    <Input type="switch" checked={config.EnableArchiveFileCompression} readOnly />
                </FormGroup>
            </AccordionBody>
        </AccordionItem>
    );
}
