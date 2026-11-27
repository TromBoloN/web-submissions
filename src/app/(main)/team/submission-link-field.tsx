"use client";

import type { ReactNode } from "react";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPaste,
  HelpCircle,
  type LucideIcon,
  RotateCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LinkCheckItem } from "@/lib/link-check";

function LinkCheckBadge({
  item,
  isChecking,
  statusId,
}: {
  item?: LinkCheckItem;
  isChecking?: boolean;
  statusId: string;
}) {
  if (isChecking) {
    return (
      <div id={statusId} className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <RotateCw className="size-3 animate-spin" />
        <span>Memeriksa tautan...</span>
      </div>
    );
  }

  if (!item) return null;

  if (item.status === "ok") {
    return (
      <div
        id={statusId}
        className="flex items-start gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-2 text-[13px] text-emerald-700 dark:text-emerald-400"
      >
        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
        <div>
          <span className="font-medium">Tautan valid:</span> {item.message}
        </div>
      </div>
    );
  }

  if (item.status === "warning") {
    return (
      <div
        id={statusId}
        className="flex items-start gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 p-2 text-[13px] text-amber-700 dark:text-amber-400"
      >
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <div>
          <span className="font-medium">Peringatan:</span> {item.message}
        </div>
      </div>
    );
  }

  return (
    <div
      id={statusId}
      className="flex items-start gap-1.5 rounded-md border border-muted bg-muted/40 p-2 text-[13px] text-muted-foreground"
    >
      <HelpCircle className="mt-0.5 size-3.5 shrink-0" />
      <div>
        <span className="font-medium">Info verifikasi:</span> {item.message}
      </div>
    </div>
  );
}

/** One required link input of the submission form: clear and paste buttons, error or help text, link-check badge. */
export function LinkField({
  id,
  label,
  icon: Icon,
  value,
  setValue,
  onUserInput,
  error,
  help,
  placeholder,
  pasteLabel,
  checkItem,
  isChecking,
  readOnly,
  disabled,
  children,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  value: string;
  setValue: (value: string) => void;
  /** Called when the team types, so the form can clear this field's error. */
  onUserInput: () => void;
  error?: string;
  help: ReactNode;
  placeholder: string;
  pasteLabel: string;
  checkItem?: LinkCheckItem;
  isChecking: boolean;
  readOnly: boolean;
  disabled: boolean;
  /** Extra hint shown under the help text. */
  children?: ReactNode;
}) {
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setValue(text.trim());
        toast.success("Tautan berhasil ditempel.");
      }
    } catch {
      toast.error("Gagal membaca papan klip.");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="flex items-center gap-1.5 font-medium">
          <Icon className="size-4 text-muted-foreground" />
          {label}
          <span className="text-destructive">*</span>
        </Label>
        {!readOnly && (
          <div className="flex items-center gap-1">
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => setValue("")}
                className="h-7 px-2 text-muted-foreground text-xs hover:text-destructive"
              >
                <Trash2 className="size-3" />
                <span>Hapus</span>
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type="url"
          inputMode="url"
          value={value}
          aria-describedby={error ? `${id}_error ${id}_status` : `${id}_help ${id}_status`}
          disabled={readOnly || disabled}
          onChange={(e) => {
            setValue(e.target.value);
            onUserInput();
          }}
          onBlur={(e) => setValue(e.target.value.trim())}
          placeholder={placeholder}
          className={error ? "border-destructive pr-10 focus-visible:ring-destructive" : "pr-10"}
        />
        {!readOnly && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={pasteLabel}
            disabled={disabled}
            onClick={handlePaste}
            className="absolute top-1/2 right-1 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <ClipboardPaste className="size-4" />
          </Button>
        )}
      </div>
      {error ? (
        <p id={`${id}_error`} className="text-[13px] text-destructive">
          {error}
        </p>
      ) : (
        <p id={`${id}_help`} className="text-[13px] text-muted-foreground">
          {help}
        </p>
      )}
      {children}
      <LinkCheckBadge item={checkItem} isChecking={isChecking} statusId={`${id}_status`} />
    </div>
  );
}
