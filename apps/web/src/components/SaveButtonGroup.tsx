import { IconDeviceFloppy, IconX } from "@tabler/icons-react";
import { HoverTooltip } from "./HoverTooltip";

type SaveButtonGroupProps = {
  formId: string;
  disabled?: boolean;
  submitting?: boolean;
  onSaveAndClose: () => void;
};

/**
 * Primary save control: Speichern keeps the EP open; the X segment saves and closes.
 */
export function SaveButtonGroup({
  formId,
  disabled = false,
  submitting = false,
  onSaveAndClose,
}: SaveButtonGroupProps) {
  const isDisabled = disabled || submitting;

  return (
    <div className="inline-flex h-9 w-full overflow-visible rounded border border-primary bg-primary text-on-primary @[36rem]:w-auto">
      <HoverTooltip
        label="Speichern und geöffnet lassen"
        className="min-w-0 flex-1 @[36rem]:flex-none"
      >
        <button
          type="submit"
          form={formId}
          disabled={isDisabled}
          className="inline-flex h-full w-full items-center justify-center gap-1.5 rounded-l-[calc(0.25rem-1px)] px-3 text-sm font-semibold transition-colors hover:bg-primary-container disabled:pointer-events-none disabled:opacity-50"
        >
          <IconDeviceFloppy size={18} stroke={1.75} />
          {submitting ? "Speichern…" : "Speichern"}
        </button>
      </HoverTooltip>

      <span
        className="my-1.5 w-px shrink-0 bg-on-primary/35"
        aria-hidden
      />

      <HoverTooltip label="Speichern und schließen" className="shrink-0">
        <button
          type="button"
          aria-label="Speichern und schließen"
          disabled={isDisabled}
          onClick={onSaveAndClose}
          className="inline-flex h-full w-9 items-center justify-center rounded-r-[calc(0.25rem-1px)] transition-colors hover:bg-primary-container disabled:pointer-events-none disabled:opacity-50"
        >
          <IconX size={18} stroke={1.75} />
        </button>
      </HoverTooltip>
    </div>
  );
}
