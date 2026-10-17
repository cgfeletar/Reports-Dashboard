"use client";

import * as Select from "@radix-ui/react-select";
import { useId } from "react";
import type { MonthKey } from "@/lib/reports-types";

export interface MonthOption {
  value: MonthKey;
  label: string;
}

interface MonthSelectProps {
  months: MonthOption[];
  value: MonthKey;
  onValueChange: (month: MonthKey) => void;
}

/** MonthSelect — Classification: WRITE NEW. Callers pass months newest first. */
export function MonthSelect({ months, value, onValueChange }: MonthSelectProps): React.JSX.Element {
  const labelId = useId();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span id={labelId} className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">
        Month
      </span>
      <Select.Root value={value} onValueChange={onValueChange}>
        <Select.Trigger
          aria-labelledby={labelId}
          className="inline-flex min-h-11 w-[200px] max-w-full items-center justify-between gap-3 rounded-full border border-line bg-white px-4 text-sm text-ink shadow-[var(--card-shadow)] transition-colors hover:bg-accent-tint focus-visible:outline-2 focus-visible:outline-accent max-xs:w-full"
        >
          <Select.Value />
          <Select.Icon className="text-accent-deep">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            position="popper"
            sideOffset={6}
            className="z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--card-shadow)]"
          >
            <Select.Viewport className="p-1.5">
              {months.map((m) => (
                <Select.Item
                  key={m.value}
                  value={m.value}
                  className="relative flex min-h-11 cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-4 text-sm text-ink outline-none data-[highlighted]:bg-accent-tint data-[state=checked]:font-medium"
                >
                  <Select.ItemIndicator className="absolute left-2.5 text-accent-deep">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                  </Select.ItemIndicator>
                  <Select.ItemText>{m.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
