import { CounterBadge } from "components/common/CounterBadge";
import { HrHeader } from "components/common/HrHeader";
import React, { ReactNode } from "react";
import { Modal, ModalBody, Button, Row, Badge, Col, UncontrolledTooltip } from "reactstrap";
import { Icon } from "components/common/Icon";
import classNames from "classnames";
import { useAppUrls } from "components/hooks/useAppUrls";
import { useAppSelector } from "components/store";
import database from "models/resources/database";
import { useEventsCollector } from "components/hooks/useEventsCollector";
import { licenseSelectors } from "components/common/shell/licenseSlice";
import { getLicenseLimitReachStatus } from "components/utils/licenseLimitsUtils";

const notSupportedInShardedDb = "Not supported in sharded databases";

interface OngoingTaskAddModalProps {
    db: database;
    subscriptionsDatabaseCount: number;
    toggle: () => void;
}

export default function OngoingTaskAddModal(props: OngoingTaskAddModalProps) {
    const { toggle, db, subscriptionsDatabaseCount } = props;

    const isSharded = db.isSharded();

    const licenseType = useAppSelector(licenseSelectors.licenseType);
    const { appUrl } = useAppUrls();

    // TODO get form endpoint
    const subscriptionsServerCount = 0;

    // TODO get from license selector
    const subscriptionsServerLimit = 3 * 5;
    const subscriptionsDatabaseLimit = 3;

    const subscriptionsServerLimitStatus = getLicenseLimitReachStatus(
        subscriptionsServerCount,
        subscriptionsServerLimit
    );

    const subscriptionsDatabaseLimitStatus = getLicenseLimitReachStatus(
        subscriptionsDatabaseCount,
        subscriptionsDatabaseLimit
    );

    const isNotEnterprise = licenseType !== "Enterprise";
    const isNotProfessionalAndEnterprise = licenseType !== "Professional" && licenseType !== "Enterprise";

    const getDisableReasonForSharded = (): string => {
        if (isSharded) {
            return notSupportedInShardedDb;
        }
    };

    const getDisableReasonForShardedBelowEnterprise = (): string => {
        if (isSharded) {
            return notSupportedInShardedDb;
        }
        if (licenseType !== "Enterprise") {
            return "Feature available in Enterprise license";
        }
    };

    const getDisableReasonForBelowProfessional = (): string => {
        if (licenseType !== "Professional" && licenseType !== "Enterprise") {
            return "Feature available in Professional and Enterprise license";
        }
    };

    const isSubscriptionDisabled =
        licenseType === "Community" &&
        (subscriptionsServerLimitStatus === "limitReached" || subscriptionsDatabaseLimitStatus === "limitReached");

    const getSubscriptionDisableReason = (): string => {
        if (!isSubscriptionDisabled) {
            return null;
        }

        return `Your ${
            subscriptionsServerLimitStatus === "limitReached" ? "server" : "database"
        } reached the maximum number of subscriptions.`;
    };

    return (
        <Modal
            isOpen
            toggle={toggle}
            container="modalContainer"
            contentClassName="modal-border bulge-primary"
            className="destination-modal"
            size="lg"
            centered
        >
            <ModalBody>
                <div className="position-absolute m-2 end-0 top-0">
                    <Button close onClick={toggle} />
                </div>
                <div className="vstack gap-4">
                    <div className="text-center">
                        <Icon icon="ongoing-tasks" color="primary" addon="plus" className="fs-1" margin="m-0" />
                    </div>
                    <div className="text-center lead">Add a Database Task</div>
                </div>
                <HrHeader>Replication</HrHeader>
                <Row>
                    <TaskItem
                        title="Create new External Replication task"
                        href={appUrl.forEditExternalReplication(db)}
                        className="external-replication"
                        target="ExternalReplication"
                        disabled={isNotProfessionalAndEnterprise}
                        disableReason={getDisableReasonForBelowProfessional()}
                    >
                        <Icon icon="external-replication" />
                        <h4 className="mt-1 mb-0">External Replication</h4>
                        {isNotProfessionalAndEnterprise && (
                            <Badge className="about-view-title-badge mt-2" color="faded-primary">
                                Professional +
                            </Badge>
                        )}
                    </TaskItem>

                    <TaskItem
                        title="Create new Replication Hub task"
                        href={appUrl.forEditReplicationHub(db)}
                        className="pull-replication-hub"
                        target="ReplicationHub"
                        disabled={isSharded}
                        disableReason={getDisableReasonForSharded()}
                    >
                        <Icon icon="pull-replication-hub" />
                        <h4 className="mt-1 mb-0">Replication Hub</h4>
                    </TaskItem>
                    <TaskItem
                        title="Create new Replication Sink task"
                        href={appUrl.forEditReplicationSink(db)}
                        className="pull-replication-sink"
                        target="ReplicationSink"
                        disabled={isSharded}
                        disableReason={getDisableReasonForSharded()}
                    >
                        <Icon icon="pull-replication-agent" />
                        <h4 className="mt-1 mb-0">Replication Sink</h4>
                    </TaskItem>
                </Row>
                <HrHeader>ETL (RavenDB ⇛ TARGET)</HrHeader>
                <Row>
                    <TaskItem
                        title="Create new RavenDB ETL task"
                        href={appUrl.forEditRavenEtl(db)}
                        className="ravendb-etl"
                        target="RavenETL"
                    >
                        <Icon icon="ravendb-etl" />
                        <h4 className="mt-1 mb-0">RavenDB ETL</h4>
                    </TaskItem>

                    <TaskItem
                        title="Create new Elasticsearch ETL task"
                        href={appUrl.forEditElasticSearchEtl(db)}
                        className="elastic-etl"
                        target="ElasticSearchETL"
                    >
                        <Icon icon="elastic-search-etl" />
                        <h4 className="mt-1 mb-0">Elasticsearch ETL</h4>
                    </TaskItem>

                    <TaskItem
                        title="Create new Kafka ETL task"
                        href={appUrl.forEditKafkaEtl(db)}
                        className="kafka-etl"
                        target="KafkaETL"
                        disabled={isSharded}
                        disableReason={getDisableReasonForSharded()}
                    >
                        <Icon icon="kafka-etl" />
                        <h4 className="mt-1 mb-0">Kafka ETL</h4>
                    </TaskItem>

                    <TaskItem
                        title="Create new SQL ETL task"
                        href={appUrl.forEditSqlEtl(db)}
                        className="sql-etl"
                        target="SqlETL"
                    >
                        <Icon icon="sql-etl" />
                        <h4 className="mt-1 mb-0">SQL ETL</h4>
                    </TaskItem>

                    <TaskItem
                        title="Create new OLAP ETL task"
                        href={appUrl.forEditOlapEtl(db)}
                        className="olap-etl"
                        target="OlapETL"
                    >
                        <Icon icon="olap-etl" />
                        <h4 className="mt-1 mb-0">OLAP ETL</h4>
                    </TaskItem>

                    <TaskItem
                        title="Create new RabbitMQ ETL task"
                        href={appUrl.forEditRabbitMqEtl(db)}
                        className="rabbitmq-etl"
                        target="RabbitMqETL"
                        disabled={isSharded}
                        disableReason={getDisableReasonForSharded()}
                    >
                        <Icon icon="rabbitmq-etl" />
                        <h4 className="mt-1 mb-0">RabbitMQ ETL</h4>
                    </TaskItem>
                </Row>
                <HrHeader>SINK (SOURCE ⇛ RavenDB)</HrHeader>
                <Row>
                    <TaskItem
                        title="Create new Kafka Sink task"
                        href={appUrl.forEditKafkaSink(db)}
                        className="kafka-sink"
                        target="KafkaSink"
                        disabled={isSharded || isNotEnterprise}
                        disableReason={getDisableReasonForShardedBelowEnterprise()}
                    >
                        <Icon icon="kafka-sink" />
                        <h4 className="mt-1 mb-0">Kafka Sink</h4>
                        {isNotEnterprise && (
                            <Badge className="about-view-title-badge mt-2" color="faded-primary">
                                Enterprise
                            </Badge>
                        )}
                    </TaskItem>

                    <TaskItem
                        title="Create new RabbitMQ Sink task"
                        href={appUrl.forEditRabbitMqSink(db)}
                        className="rabbitmq-sink"
                        target="RabbitMqSink"
                        disabled={isSharded || isNotEnterprise}
                        disableReason={getDisableReasonForShardedBelowEnterprise()}
                    >
                        <Icon icon="rabbitmq-sink" />
                        <h4 className="mt-1 mb-0">RabbitMQ Sink</h4>
                        {isNotEnterprise && (
                            <Badge className="about-view-title-badge mt-2" color="faded-primary">
                                Enterprise
                            </Badge>
                        )}
                    </TaskItem>
                </Row>
                <HrHeader>Backups & Subscriptions</HrHeader>
                <Row>
                    <TaskItem
                        title="Create new Backup task"
                        href={appUrl.forEditPeriodicBackupTask(db)}
                        className="backup"
                        target="PeriodicBackup"
                    >
                        <Icon icon="periodic-backup" />
                        <h4 className="mt-1 mb-0">Periodic Backup</h4>
                    </TaskItem>

                    <TaskItem
                        title="Create new Subscription task"
                        href={appUrl.forEditSubscription(db)}
                        className="subscription"
                        target="Subscription"
                        disabled={isSubscriptionDisabled}
                        disableReason={getSubscriptionDisableReason()}
                    >
                        <Icon icon="subscription" />
                        <h4 className="mt-1 mb-0">Subscription</h4>
                        {licenseType === "Community" && (
                            <CounterBadge
                                className="mt-2"
                                count={subscriptionsDatabaseCount}
                                limit={subscriptionsDatabaseLimit}
                                hideNotReached
                            />
                        )}
                    </TaskItem>
                </Row>
            </ModalBody>
        </Modal>
    );
}

interface TaskItemProps {
    title: string;
    href: string;
    className: string;
    target: string;
    children: ReactNode | ReactNode[];
    disabled?: boolean;
    disableReason?: string | ReactNode | ReactNode[];
}

function TaskItem(props: TaskItemProps) {
    const { title, href, className, target, children, disabled, disableReason } = props;

    const { reportEvent } = useEventsCollector();

    return (
        <Col xs="6" md="4" className="mb-4 justify-content-center" title={title}>
            {disabled ? (
                <div id={target} className={classNames("task-item", className, { "item-disabled": disabled })}>
                    {children}
                </div>
            ) : (
                <a
                    href={href}
                    onClick={() => reportEvent(target, "new")}
                    id={target}
                    className={classNames("task-item no-decor cursor-pointer", className)}
                >
                    {children}
                </a>
            )}
            {disabled && disableReason && <UncontrolledTooltip target={target}>{disableReason}</UncontrolledTooltip>}
        </Col>
    );
}