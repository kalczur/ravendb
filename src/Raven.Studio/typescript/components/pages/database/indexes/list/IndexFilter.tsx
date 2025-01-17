﻿import { IndexStatus, IndexFilterCriteria, IndexType, IndexGroupBy, IndexSortBy } from "components/models/indexes";
import { Button, Input, PopoverBody, UncontrolledPopover } from "reactstrap";
import { produce } from "immer";
import { Icon } from "components/common/Icon";
import { MultiCheckboxToggle } from "components/common/toggles/MultiCheckboxToggle";
import { InputItem, SortDirection } from "components/models/common";
import { Switch } from "components/common/Checkbox";
import { SortDropdown, SortDropdownRadioList, sortItem } from "components/common/SortDropdown";

interface IndexFilterProps {
    filter: IndexFilterCriteria;
    setFilter: (x: IndexFilterCriteria) => void;
    filterByStatusOptions: InputItem<IndexStatus>[];
    filterByTypeOptions: InputItem<IndexType>[];
    indexesCount: number;
}

export default function IndexFilter(props: IndexFilterProps) {
    const { filter, setFilter, filterByStatusOptions, filterByTypeOptions, indexesCount } = props;

    // TODO sharding

    /* TODO
    let totalProcessedPerSecond = 0;

    this.indexGroups().forEach(indexGroup => {
        const indexesInGroup = indexGroup.indexes().filter(i => !i.filteredOut());
        indexesCount += indexesInGroup.length;

        totalProcessedPerSecond += _.sum(indexesInGroup
            .filter(i => i.progress() || (i.replacement() && i.replacement().progress()))
            .map(i => {
                let sum = 0;

                const progress = i.progress();
                if (progress) {
                    sum += progress.globalProgress().processedPerSecond();
                }

                const replacement = i.replacement();
                if (replacement) {
                    const replacementProgress = replacement.progress();
                    if (replacementProgress) {
                        sum += replacementProgress.globalProgress().processedPerSecond();
                    }
                }

                return sum;
            }));
    });
    */

    /* TODO
    const indexingErrorsOnlyPart = filter.showOnlyIndexesWithIndexingErrors ? (
        <>
            <Badge pill color="warning" className="mx-1">
                indexing errors only
            </Badge>{" "}
        </>
    ) : (
        ""
    );*/

    const onFilterValueChange = <T extends keyof IndexFilterCriteria>(key: T, value: IndexFilterCriteria[T]) => {
        setFilter(
            produce(filter, (draft) => {
                draft[key] = value;
            })
        );
    };

    return (
        <div className="hstack flex-wrap align-items-end gap-3 my-3 justify-content-end">
            <div className="flex-grow">
                <div className="small-label ms-1 mb-1">Filter by name</div>
                <div className="clearable-input">
                    <Input
                        type="text"
                        accessKey="/"
                        placeholder="e.g. Orders/ByCompany/*"
                        title="Filter indexes"
                        className="filtering-input"
                        value={filter.searchText}
                        onChange={(e) => onFilterValueChange("searchText", e.target.value)}
                    />
                    {filter.searchText && (
                        <div className="clear-button">
                            <Button color="secondary" size="sm" onClick={() => onFilterValueChange("searchText", "")}>
                                <Icon icon="clear" margin="m-0" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <MultiCheckboxToggle
                inputItems={filterByStatusOptions}
                label="Filter by state"
                selectedItems={filter.statuses}
                setSelectedItems={(x) => onFilterValueChange("statuses", x)}
                selectAll
                selectAllLabel="All"
                selectAllCount={indexesCount}
            />
            <MultiCheckboxToggle
                inputItems={filterByTypeOptions}
                label="Filter by type"
                selectedItems={filter.types}
                setSelectedItems={(x) => onFilterValueChange("types", x)}
                selectAllCount={indexesCount}
            />
            <div>
                <div className="small-label ms-1 mb-1">Sort & Group</div>

                <SortDropdown label={<SortLabel filter={filter} />}>
                    <SortDropdownRadioList
                        radioOptions={sortByOptions}
                        label="Sort by"
                        selected={filter.sortBy}
                        setSelected={(x) => onFilterValueChange("sortBy", x)}
                    />
                    <SortDropdownRadioList
                        radioOptions={sortDirectionOptions}
                        label="Sort direction"
                        selected={filter.sortDirection}
                        setSelected={(x) => onFilterValueChange("sortDirection", x)}
                    />
                    <SortDropdownRadioList
                        radioOptions={groupByOptions}
                        label="Group by"
                        selected={filter.groupBy}
                        setSelected={(x) => onFilterValueChange("groupBy", x)}
                    />
                </SortDropdown>
            </div>
            {/* TODO: `Processing Speed: <strong>${Math.floor(totalProcessedPerSecond).toLocaleString()}</strong> docs / sec`;*/}
            <Switch
                id="autoRefresh"
                toggleSelection={() => onFilterValueChange("autoRefresh", !filter.autoRefresh)}
                selected={filter.autoRefresh}
                color="info"
                className="mt-1"
            >
                <span>Auto refresh is {filter.autoRefresh ? "on" : "off"}</span>
            </Switch>
            <UncontrolledPopover target="autoRefresh" trigger="hover" placement="bottom">
                <PopoverBody>
                    Automatically refreshes the list of indexes.
                    <br />
                    Might result in list flickering.
                </PopoverBody>
            </UncontrolledPopover>
        </div>
    );
}

const sortByOptions: sortItem<IndexSortBy>[] = [
    { value: "name", label: "Name" },
    { value: "createdTimestamp", label: "Creation time" },
    { value: "lastIndexingTime", label: "Last indexing time" },
    { value: "lastQueryingTime", label: "Last querying time" },
];

const sortDirectionOptions: sortItem<SortDirection>[] = [
    { value: "asc", label: "Ascending" },
    { value: "desc", label: "Descending" },
];

const groupByOptions: sortItem<IndexGroupBy>[] = (["Collection", "None"] satisfies IndexGroupBy[]).map((x) => ({
    value: x,
    label: x,
}));

function SortLabel({ filter }: { filter: IndexFilterCriteria }) {
    return (
        <>
            {sortByOptions.find((x) => x.value === filter.sortBy).label}
            {filter.sortDirection === "asc" ? (
                <Icon icon="arrow-thin-bottom" margin="ms-1" />
            ) : (
                <Icon icon="arrow-thin-top" margin="ms-1" />
            )}
            {filter.groupBy !== "None" && (
                <span className="ms-2">{groupByOptions.find((x) => x.value === filter.groupBy).label}</span>
            )}
        </>
    );
}
