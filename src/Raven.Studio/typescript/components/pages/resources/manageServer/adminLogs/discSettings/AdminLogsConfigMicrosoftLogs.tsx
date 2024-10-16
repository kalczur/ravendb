import { AccordionBody, AccordionHeader, AccordionItem } from "reactstrap";

interface AdminLogsConfigMicrosoftLogsProps {
    targetId: string;
    config: Raven.Client.ServerWide.Operations.Logs.GetLogsConfigurationResult["MicrosoftLogs"];
    // close: () => void;
    // reloadConfig: () => void;
}

export default function AdminLogsConfigMicrosoftLogs({
    targetId,
    // config,
    // reloadConfig,
}: AdminLogsConfigMicrosoftLogsProps) {
    return (
        <AccordionItem className="p-1 bg-black">
            <AccordionHeader targetId={targetId}>Microsoft logs</AccordionHeader>
            <AccordionBody accordionId={targetId}></AccordionBody>
        </AccordionItem>
    );
}
