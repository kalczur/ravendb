import React from "react";
import genUtils from "common/generalUtils";
import { Checkbox, CheckboxProps, Radio, Switch } from "components/common/Checkbox";
import { Control, ControllerProps, FieldPath, FieldValues, useController } from "react-hook-form";
import { Input, InputProps } from "reactstrap";
import { InputType } from "reactstrap/types/lib/Input";

type FormElementProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>> = Omit<
    ControllerProps<TFieldValues, TName>,
    "render" | "control"
> & {
    control: Control<TFieldValues>;
};

type FormInputProps = InputProps & {
    type: Extract<InputType, "text" | "textarea" | "number" | "password">;
};

type FormToggleProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>> = FormElementProps<
    TFieldValues,
    TName
> &
    Omit<CheckboxProps, "selected" | "toggleSelection">;

export function FormInput<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>(props: FormElementProps<TFieldValues, TName> & FormInputProps) {
    return <FormInputGeneral {...props} />;
}

export function FormSelect<
    TOption extends string | number,
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>(
    props: FormElementProps<TFieldValues, TName> &
        Omit<InputProps, "type"> & { options: valueAndLabelItem<TOption, string>[] }
) {
    const { options, ...rest } = props;

    return (
        <FormInputGeneral type="select" {...rest}>
            {options.map((x) => (
                <option key={x.value} value={x.value}>
                    {x.label}
                </option>
            ))}
        </FormInputGeneral>
    );
}

export function FormCheckbox<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>(
    props: FormToggleProps<TFieldValues, TName>
) {
    return <FormToggle type="checkbox" {...props} />;
}

export function FormSwitch<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>(
    props: FormToggleProps<TFieldValues, TName>
) {
    return <FormCheckbox type="switch" {...props} />;
}

export function FormRadio<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>(
    props: FormToggleProps<TFieldValues, TName>
) {
    return <FormCheckbox type="radio" {...props} />;
}

function FormInputGeneral<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>(props: FormElementProps<TFieldValues, TName> & InputProps) {
    const { name, control, defaultValue, rules, shouldUnregister, children, type, ...rest } = props;

    const {
        field: { onChange, onBlur, value },
        fieldState: { error, invalid },
    } = useController({
        name,
        control,
        rules,
        defaultValue,
        shouldUnregister,
    });

    return (
        <div>
            <Input
                name={name}
                type={type}
                onBlur={onBlur}
                onChange={onChange}
                value={value == null ? "" : value}
                invalid={invalid}
                {...rest}
            >
                {children}
            </Input>
            {error && <div className="text-danger small">{error.message}</div>}
        </div>
    );
}

function FormToggle<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>(
    props: FormToggleProps<TFieldValues, TName> & { type: Extract<InputType, "checkbox" | "switch" | "radio"> }
) {
    const { name, control, rules, defaultValue, type, shouldUnregister, ...rest } = props;

    const {
        field: { onChange, onBlur, value },
        fieldState: { error, invalid },
    } = useController({
        name,
        control,
        rules,
        defaultValue,
        shouldUnregister,
    });

    let ToggleComponent: (props: CheckboxProps) => JSX.Element;
    switch (type) {
        case "checkbox":
            ToggleComponent = Checkbox;
            break;
        case "switch":
            ToggleComponent = Switch;
            break;
        case "radio":
            ToggleComponent = Radio;
            break;
        default:
            genUtils.assertUnreachable(type);
    }

    return (
        <div>
            <ToggleComponent
                selected={!!value}
                toggleSelection={onChange}
                invalid={invalid}
                onBlur={onBlur}
                {...rest}
            />
            {invalid && <div className="text-danger small">{error.message}</div>}
        </div>
    );
}
