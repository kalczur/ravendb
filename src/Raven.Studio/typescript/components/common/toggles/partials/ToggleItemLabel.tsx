import ToggleLimitBadge from "components/common/toggles/partials/ToggleLimitBadge";
import { InputItem } from "components/models/common";
import { PopoverBody, UncontrolledPopover } from "reactstrap";

interface ToggleItemLabelProps<T extends string | number = string> {
    id: string;
    inputItem: InputItem<T>;
}

export default function ToggleItemLabel<T extends string | number = string>({
    id,
    inputItem,
}: ToggleItemLabelProps<T>) {
    return (
        <>
            <label htmlFor={id}>
                <span>{inputItem.label}</span>
                {inputItem.count !== null && inputItem.limit ? (
                    <ToggleLimitBadge target={id} count={inputItem.count} limit={inputItem.limit} />
                ) : (
                    <span className="multi-toggle-item-count">{inputItem.count}</span>
                )}
            </label>
            {inputItem.popover && (
                <UncontrolledPopover
                    target={id}
                    trigger="hover"
                    placement={inputItem.popoverPlacement ?? "top"}
                    className="bs5"
                >
                    <PopoverBody>{inputItem.popover}</PopoverBody>
                </UncontrolledPopover>
            )}
        </>
    );
}
