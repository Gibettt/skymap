"use client";

import * as React from "react";

import { Clock3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

interface TimeParts {
  hour: string;
  minute: string;
  period: "AM" | "PM";
}

interface TimePickerProps {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  "aria-invalid"?: boolean;
}

function parseTime(value: string | undefined): TimeParts {
  const [rawHour = "21", rawMinute = "00"] = value?.split(":") ?? [];
  const hour24 = Number(rawHour);
  const safeHour = Number.isInteger(hour24) && hour24 >= 0 && hour24 <= 23 ? hour24 : 21;
  const minute = /^\d{2}$/.test(rawMinute) && Number(rawMinute) <= 59 ? rawMinute : "00";

  return {
    hour: String(safeHour % 12 || 12).padStart(2, "0"),
    minute,
    period: safeHour >= 12 ? "PM" : "AM",
  };
}

function serializeTime({ hour, minute, period }: TimeParts) {
  const hour12 = Number(hour);
  const hour24 = period === "AM" ? hour12 % 12 : (hour12 % 12) + 12;
  return `${String(hour24).padStart(2, "0")}:${minute}`;
}

function formatTime(value: string | undefined) {
  if (!value) return "Select time";
  const parts = parseTime(value);
  return `${parts.hour}:${parts.minute} ${parts.period}`;
}

export function TimePicker({
  id,
  name,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  required = false,
  "aria-invalid": ariaInvalid,
}: TimePickerProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
  const currentValue = value ?? internalValue;
  const parts = parseTime(currentValue || defaultValue);

  function updateTime(nextParts: Partial<TimeParts>) {
    const nextValue = serializeTime({ ...parts, ...nextParts });
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className="w-full justify-between"
          disabled={disabled}
          aria-required={required}
          aria-invalid={ariaInvalid}
        >
          {formatTime(currentValue || defaultValue)}
          <Clock3 data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width)">
        <FieldGroup className="grid grid-cols-3 gap-2">
          <Field>
            <FieldLabel className="sr-only">Hour</FieldLabel>
            <Select value={parts.hour} onValueChange={(nextHour) => nextHour && updateTime({ hour: nextHour })}>
              <SelectTrigger className="w-full" aria-label="Hour">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  {HOURS.map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel className="sr-only">Minute</FieldLabel>
            <Select value={parts.minute} onValueChange={(minute) => minute && updateTime({ minute })}>
              <SelectTrigger className="w-full" aria-label="Minute">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  {MINUTES.map((minute) => (
                    <SelectItem key={minute} value={minute}>
                      {minute}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel className="sr-only">Period</FieldLabel>
            <Select
              value={parts.period}
              onValueChange={(period) => period && updateTime({ period: period as TimeParts["period"] })}
            >
              <SelectTrigger className="w-full" aria-label="AM or PM">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  <SelectItem value="AM">AM</SelectItem>
                  <SelectItem value="PM">PM</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
      </PopoverContent>
      {name ? <input type="hidden" name={name} value={currentValue || defaultValue || ""} /> : null}
    </Popover>
  );
}
