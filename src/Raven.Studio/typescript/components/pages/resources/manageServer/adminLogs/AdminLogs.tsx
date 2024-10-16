import { useReactTable, getCoreRowModel, ColumnDef, Table } from "@tanstack/react-table";
import adminLogsWebSocketClient from "common/adminLogsWebSocketClient";
import { Icon } from "components/common/Icon";
import { LazyLoad } from "components/common/LazyLoad";
import { RichPanel, RichPanelDetails, RichPanelHeader } from "components/common/RichPanel";
import SizeGetter from "components/common/SizeGetter";
import { CellWithCopyWrapper } from "components/common/virtualTable/cells/CellWithCopy";
import { virtualTableUtils } from "components/common/virtualTable/utils/virtualTableUtils";
import VirtualTable from "components/common/virtualTable/VirtualTable";
import useBoolean from "components/hooks/useBoolean";
import { useServices } from "components/hooks/useServices";
import AdminLogsDiscSettingsModal from "components/pages/resources/manageServer/adminLogs/discSettings/AdminLogsDiscSettingsModal";
import AdminLogsViewSettingsModal from "components/pages/resources/manageServer/adminLogs/viewSettings/AdminLogsViewSettingsModal";
import adminLogsConfig from "models/database/debug/adminLogsConfig";
import { useEffect, useMemo, useState } from "react";
import { useAsync } from "react-async-hook";
import { Button, Col, Row } from "reactstrap";

interface AdminLogsMessage {
    Date: string;
    Level: string;
    Resource: string;
    Component: string;
    Logger: string;
    Message: string;
    Data: string;
}

export default function AdminLogs() {
    return <SizeGetter render={({ width }) => <AdminLogsWithSize width={width} />} />;
}

interface AdminLogsWithSizeProps {
    width: number;
}

function AdminLogsWithSize({ width }: AdminLogsWithSizeProps) {
    const [logs, setLogs] = useState<AdminLogsMessage[]>([]);

    const { value: isMonitorTail, toggle: toggleIsMonitorTail } = useBoolean(false);
    const { value: isDiscSettingOpen, toggle: toggleIsDiscSettingOpen } = useBoolean(false);
    const { value: isViewSettingOpen, toggle: toggleIsViewSettingOpen } = useBoolean(false);

    useEffect(() => {
        new adminLogsWebSocketClient(adminLogsConfig.empty(), (message) => setLogs((prev) => [message, ...prev]));
    }, []);

    const columns = useMemo(() => getColumns(width), []);

    const { manageServerService } = useServices();

    const asyncGetConfiguration = useAsync(manageServerService.getAdminLogsConfiguration, [], {
        onSuccess: (config) => {
            console.log("kalczur config", config);
        },
    });

    const clearLogs = () => {
        setLogs([]);
    };

    const table = useReactTable({
        defaultColumn: {
            enableSorting: false,
        },
        data: logs,
        columns,
        columnResizeMode: "onChange",
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="content-padding vstack">
            <Row>
                <Col md={7}>
                    <RichPanel color="secondary">
                        <RichPanelHeader className="text-white d-flex justify-content-between">
                            <span>
                                <Icon icon="client" />
                                Logs on this view
                            </span>
                            <LogsLevel
                                level={asyncGetConfiguration.result?.AdminLogs?.CurrentMinLevel}
                                isLoading={asyncGetConfiguration.loading}
                            />
                        </RichPanelHeader>
                        <RichPanelDetails>
                            <div className="d-flex gap-2 flex-wrap">
                                <Button type="button" color="warning" outline onClick={() => {}}>
                                    <Icon icon="pause" />
                                    Pause
                                </Button>
                                <Button type="button" color="danger" outline onClick={clearLogs}>
                                    <Icon icon="cancel" />
                                    Clear
                                </Button>
                                <Button type="button" color="light" outline onClick={toggleIsMonitorTail}>
                                    <Icon icon="check" />
                                    Monitor (tail -f)
                                </Button>
                                <Button type="button" color="light" outline onClick={() => {}}>
                                    <Icon icon="export" />
                                    Export
                                </Button>
                                <Button type="button" color="light" outline onClick={toggleIsViewSettingOpen}>
                                    <Icon icon="settings" />
                                    Settings
                                </Button>
                                {isViewSettingOpen && (
                                    <AdminLogsViewSettingsModal
                                        config={asyncGetConfiguration.result?.AdminLogs}
                                        toggle={toggleIsViewSettingOpen}
                                        reloadConfig={asyncGetConfiguration.execute}
                                    />
                                )}
                            </div>
                        </RichPanelDetails>
                    </RichPanel>
                </Col>
                <Col md={5}>
                    <RichPanel color="secondary">
                        <RichPanelHeader className="text-white d-flex justify-content-between">
                            <span>
                                <Icon icon="drive" />
                                Logs on disc
                            </span>
                            <LogsLevel
                                level={asyncGetConfiguration.result?.Logs?.CurrentMinLevel}
                                isLoading={asyncGetConfiguration.loading}
                            />
                        </RichPanelHeader>
                        <RichPanelDetails>
                            <div className="d-flex gap-2 flex-wrap">
                                <Button type="button" color="light" outline onClick={() => {}}>
                                    <Icon icon="download" />
                                    Download
                                </Button>
                                <Button type="button" color="light" outline onClick={toggleIsDiscSettingOpen}>
                                    <Icon icon="settings" />
                                    Settings
                                </Button>
                                {isDiscSettingOpen && (
                                    <AdminLogsDiscSettingsModal
                                        config={asyncGetConfiguration.result}
                                        toggle={toggleIsDiscSettingOpen}
                                        reloadConfig={asyncGetConfiguration.execute}
                                    />
                                )}
                            </div>
                        </RichPanelDetails>
                    </RichPanel>
                </Col>
            </Row>
            <div className="d-flex justify-content-end mt-1">
                <Button type="button" color="link" size="xs">
                    <Icon icon="settings" />
                    Display settings
                </Button>
            </div>
            <div className="flex-grow-1">
                <SizeGetter isHeighRequired render={({ height }) => <AdminLogsTable table={table} height={height} />} />
            </div>
        </div>
    );
}

interface AdminLogsTableProps {
    table: Table<AdminLogsMessage>;
    height: number;
}

function AdminLogsTable({ table, height }: AdminLogsTableProps) {
    return <VirtualTable table={table} heightInPx={height} />;
}

const getColumns = (width: number): ColumnDef<AdminLogsMessage>[] => {
    const sizeProvider = virtualTableUtils.getCellSizeProvider(width);

    return [
        {
            header: "Date",
            accessorKey: "Date",
            cell: CellWithCopyWrapper,
            size: sizeProvider(15),
        },
        {
            header: "Level",
            accessorKey: "Level",
            cell: CellWithCopyWrapper,
            size: sizeProvider(10),
        },
        {
            header: "Resource",
            accessorKey: "Resource",
            cell: CellWithCopyWrapper,
            size: sizeProvider(10),
        },
        {
            header: "Component",
            accessorKey: "Component",
            cell: CellWithCopyWrapper,
            size: sizeProvider(10),
        },
        {
            header: "Logger",
            accessorKey: "Logger",
            cell: CellWithCopyWrapper,
            size: sizeProvider(15),
        },
        {
            header: "Message",
            accessorKey: "Message",
            cell: CellWithCopyWrapper,
            size: sizeProvider(25),
        },
        {
            header: "Data",
            accessorKey: "Data",
            cell: CellWithCopyWrapper,
            size: sizeProvider(10),
        },
    ];
};

interface LogsLevelProps {
    level: Sparrow.Logging.LogLevel;
    isLoading: boolean;
}

function LogsLevel({ level, isLoading }: LogsLevelProps) {
    return (
        <div className="d-flex align-items-center">
            <Icon icon="logs" addon="arrow-filled-up" />
            Level: {isLoading ? <LazyLoad active>?????</LazyLoad> : level}
        </div>
    );
}
