import { AccordionItem, AccordionHeader, AccordionBody } from "reactstrap";

interface AdminLogsConfigEventListenerProps {
    targetId: string;
}

export default function AdminLogsConfigEventListener({ targetId }: AdminLogsConfigEventListenerProps) {
    return (
        <AccordionItem className="p-1 bg-black">
            <AccordionHeader targetId={targetId}>Event listener</AccordionHeader>
            <AccordionBody accordionId={targetId}></AccordionBody>
        </AccordionItem>
    );
}
