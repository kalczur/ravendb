﻿import React from "react";
import "./Toggles.scss";
import useId from "hooks/useId";
import classNames from "classnames";
import { InputItem } from "components/models/common";

interface MultiRadioToggleProps<T = string> {
    inputItems: InputItem<T>[];
    selectedItem: T;
    setSelectedItem: (x: T) => void;
    className?: string;
    label?: string;
}

export function MultiRadioToggle<T = string>({
    inputItems,
    selectedItem,
    setSelectedItem,
    className,
    label,
}: MultiRadioToggleProps<T>) {
    const uniqueId = useId("multi-radio-toggle");

    return (
        <div className={classNames("multi-toggle", className)}>
            {label && <div className="small-label ms-1 mb-1">{label}</div>}
            <div className="multi-toggle-list">
                {inputItems.map((inputItem) => (
                    <div className="multi-toggle-item" key={uniqueId + inputItem.label}>
                        <input
                            id={uniqueId + inputItem.label}
                            type="radio"
                            name={uniqueId + inputItem.label}
                            checked={inputItem.value === selectedItem}
                            onChange={() => setSelectedItem(inputItem.value)}
                        />
                        <label htmlFor={uniqueId + inputItem.label}>
                            <span>
                                {inputItem.label}
                                {inputItem.count >= 0 && (
                                    <span className="multi-toggle-item-count">{inputItem.count}</span>
                                )}
                            </span>
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
}
