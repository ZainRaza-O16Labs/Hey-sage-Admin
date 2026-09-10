"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { ChevronDown, Check } from "lucide-react";

type OptionData = { value: string; label: string; disabled?: boolean };

function optionsFromChildren(children: React.ReactNode): OptionData[] {
  const result: OptionData[] = [];
  React.Children.forEach(children, (child) => {
    if (
      React.isValidElement(child) &&
      (child as React.ReactElement).type === "option"
    ) {
      const opt = child as React.ReactElement<{
        value?: string | number;
        children?: React.ReactNode;
        disabled?: boolean;
      }>;
      const value =
        opt.props.value != null
          ? String(opt.props.value)
          : String(opt.props.children ?? "");
      const label =
        typeof opt.props.children === "string"
          ? opt.props.children
          : String(opt.props.children ?? "");
      result.push({ value, label, disabled: Boolean(opt.props.disabled) });
    }
  });
  return result;
}

function makeChangeEvent(val: string) {
  return {
    target: { value: val },
    currentTarget: { value: val },
    type: "change",
    bubbles: true,
    cancelable: false,
    nativeEvent: new Event("change"),
    preventDefault: () => {},
    stopPropagation: () => {},
    isDefaultPrevented: () => false,
    isPropagationStopped: () => false,
    persist: () => {},
  } as React.ChangeEvent<HTMLSelectElement>;
}

function NativeSelect({
  className,
  children,
  value,
  onChange,
  disabled,
  id,
  name,
  required,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
}: React.ComponentProps<"select">) {
  const [open, setOpen] = useState(false);
  const options = optionsFromChildren(children);

  const ariaInvalidBool =
    ariaInvalid === true || ariaInvalid === "true";

  return (
    <SelectPrimitive.Root
      value={value != null ? String(value) : null}
      onValueChange={(next: string | null) => {
        if (next != null) {
          onChange?.(makeChangeEvent(next));
        }
      }}
      disabled={disabled}
      name={name}
      required={required}
      items={options.map((o) => ({ value: o.value, label: o.label }))}
      open={open}
      onOpenChange={setOpen}
    >
      <SelectPrimitive.Trigger
        data-slot="select"
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-invalid={ariaInvalidBool || undefined}
        className={cn(
          "group inline-flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition-colors",
          "hover:bg-muted/50",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "dark:bg-input/30",
          "data-open:border-ring data-open:ring-3 data-open:ring-ring/50",
          "data-invalid:border-destructive data-invalid:ring-3 data-invalid:ring-destructive/20",
          "dark:data-invalid:border-destructive/50 dark:data-invalid:ring-destructive/40",
          className,
        )}
      >
        <SelectPrimitive.Value
          placeholder={<span className="text-muted-foreground">Select…</span>}
          className="flex-1 truncate text-left"
        />
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-all duration-150 group-hover:text-foreground",
            open && "text-foreground",
          )}
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        />
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          side="bottom"
          sideOffset={4}
          align="start"
          alignItemWithTrigger={false}
          className="z-[60]"
        >
          <SelectPrimitive.Popup
            className={cn(
              "rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-lg shadow-black/5",
              "dark:bg-[oklch(0.225_0_0)] dark:shadow-black/40",
              "animate-in fade-in-0 zoom-in-95 duration-100",
              "min-w-[var(--anchor-width)] max-h-60 overflow-y-auto",
            )}
            role="listbox"
          >
            {options.length === 0 ? (
              <div className="px-2.5 py-1.5 text-sm text-muted-foreground">
                No options
              </div>
            ) : (
              options.map((opt) => (
                <SelectPrimitive.Item
                  key={opt.value}
                  value={opt.value}
                  disabled={opt.disabled}
                  className={cn(
                    "group/item relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm text-popover-foreground outline-none transition-colors",
                    "data-[highlighted]:bg-black/[0.06] data-[highlighted]:text-foreground",
                    "dark:data-[highlighted]:bg-white/[0.06] dark:data-[highlighted]:text-popover-foreground",
                    "data-[selected]:font-medium",
                    "disabled:pointer-events-none disabled:opacity-50",
                  )}
                >
                  <Check className="size-3.5 shrink-0 opacity-0 transition-opacity group-data-[selected]/item:opacity-100" />
                  <SelectPrimitive.ItemText>
                    {opt.label}
                  </SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))
            )}
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export { NativeSelect };
