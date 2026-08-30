"use client";

import { useState } from "react";
import { Button } from "../ui/Button";

function presetDate(hoursFromNow: number, atHour?: number, atMinute = 0): Date {
  const d = new Date();
  if (atHour !== undefined) {
    d.setDate(d.getDate() + 1);
    d.setHours(atHour, atMinute, 0, 0);
  } else {
    d.setHours(d.getHours() + hoursFromNow, 0, 0, 0);
  }
  return d;
}

const PRESETS = [
  { label: "Tomorrow", get: () => presetDate(0, 9) },
  { label: "Tomorrow, 10:00 AM", get: () => presetDate(0, 10) },
  { label: "Tomorrow, 11:00 AM", get: () => presetDate(0, 11) },
  { label: "Tomorrow, 3:00 PM", get: () => presetDate(0, 15) },
];

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SendLaterPopover({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
}) {
  const [customValue, setCustomValue] = useState("");
  const [selected, setSelected] = useState<Date | null>(null);

  if (!open) return null;

  return (
    <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-paper-border bg-white p-4 shadow-lg">
      <p className="mb-2 text-sm font-medium text-ink">Send Later</p>

      <input
        type="datetime-local"
        value={customValue}
        onChange={(e) => {
          setCustomValue(e.target.value);
          setSelected(e.target.value ? new Date(e.target.value) : null);
        }}
        placeholder="Pick date & time"
        className="mb-3 w-full rounded border border-paper-border px-2 py-1.5 text-xs text-ink"
      />

      <div className="mb-4 flex flex-col gap-0.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => {
              const d = preset.get();
              setSelected(d);
              setCustomValue(toLocalInputValue(d));
            }}
            className="rounded px-2 py-1.5 text-left text-sm text-ink hover:bg-paper"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!selected}
          onClick={() => {
            if (selected) onConfirm(selected);
          }}
        >
          Done
        </Button>
      </div>
    </div>
  );
}
