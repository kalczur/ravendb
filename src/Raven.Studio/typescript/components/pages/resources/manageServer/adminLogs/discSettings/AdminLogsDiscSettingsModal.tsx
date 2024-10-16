import { Icon } from "components/common/Icon";
import AdminLogsConfigAuditLogs from "components/pages/resources/manageServer/adminLogs/discSettings/AdminLogsConfigAuditLogs";
import AdminLogsConfigEventListener from "components/pages/resources/manageServer/adminLogs/discSettings/AdminLogsConfigEventListener";
import AdminLogsConfigLogs from "components/pages/resources/manageServer/adminLogs/discSettings/AdminLogsConfigLogs";
import AdminLogsConfigMicrosoftLogs from "components/pages/resources/manageServer/adminLogs/discSettings/AdminLogsConfigMicrosoftLogs";
import AdminLogsConfigTrafficWatch from "components/pages/resources/manageServer/adminLogs/discSettings/AdminLogsConfigTrafficWatch";
import { useState } from "react";
import { Accordion, CloseButton, Modal, ModalBody } from "reactstrap";

type ConfigSection = "logs" | "auditLogs" | "microsoftLogs" | "trafficWatch" | "eventListener";

interface AdminLogsDiscSettingsModalProps {
    config: Raven.Client.ServerWide.Operations.Logs.GetLogsConfigurationResult;
    toggle: () => void;
    reloadConfig: () => void;
}

export default function AdminLogsDiscSettingsModal({ config, toggle, reloadConfig }: AdminLogsDiscSettingsModalProps) {
    const [open, setOpen] = useState<ConfigSection>(null);

    const toggleAccordion = (id: ConfigSection) => {
        if (open === id) {
            setOpen(null);
        } else {
            setOpen(id);
        }
    };

    return (
        <Modal isOpen wrapClassName="bs5" centered size="lg">
            <ModalBody>
                <div className="d-flex">
                    <h3>
                        <Icon icon="drive" addon="settings" />
                        Settings - logs on disc
                    </h3>
                    <CloseButton className="ms-auto" onClick={toggle} />
                </div>

                <Accordion
                    open={open}
                    toggle={toggleAccordion}
                    className="bs5 about-view-accordion overflow-scroll"
                    style={{ maxHeight: "500px" }}
                >
                    <AdminLogsConfigLogs
                        targetId="logs"
                        config={config.Logs}
                        close={() => toggleAccordion("logs")}
                        reloadConfig={reloadConfig}
                    />
                    <AdminLogsConfigAuditLogs targetId="auditLogs" config={config.AuditLogs} />
                    <AdminLogsConfigMicrosoftLogs targetId="microsoftLogs" config={config.MicrosoftLogs} />
                    <AdminLogsConfigTrafficWatch targetId="trafficWatch" />
                    <AdminLogsConfigEventListener targetId="eventListener" />
                </Accordion>
            </ModalBody>
        </Modal>
    );
}
