import { AccordionItem, AccordionHeader, AccordionBody } from "reactstrap";

interface AdminLogsConfigTrafficWatchProps {
    targetId: string;
}

export default function AdminLogsConfigTrafficWatch({ targetId }: AdminLogsConfigTrafficWatchProps) {
    return (
        <AccordionItem className="p-1 bg-black">
            <AccordionHeader targetId={targetId}>Traffic watch</AccordionHeader>
            <AccordionBody accordionId={targetId}></AccordionBody>
        </AccordionItem>
    );
}
