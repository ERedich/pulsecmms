import { IconMenu2 } from "@tabler/icons-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

type OptionsActionsProps = {
  /** Rendered twice (inline + menu); must return a fresh tree each call. */
  children: () => ReactNode;
  /** Content between inline actions and the sandwich (e.g. error). */
  aside?: ReactNode;
  /** Accessible name for the sandwich button. */
  label?: string;
};

/**
 * Ribbon CRUD/actions: inline on wide ribbons, sandwich menu (right) when narrow.
 * Parent must be a `@container` for the width query to apply.
 */
export function OptionsActions({
  children,
  aside,
  label = "Aktionen",
}: OptionsActionsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <div className="hidden shrink-0 items-center gap-2 @[36rem]:flex">
        {children()}
      </div>

      {aside}

      <div
        ref={rootRef}
        className="relative ml-auto shrink-0 @[36rem]:hidden"
      >
        <button
          type="button"
          aria-label={label}
          aria-expanded={open}
          aria-controls={menuId}
          aria-haspopup="menu"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-9 w-9 items-center justify-center rounded border border-outline-variant bg-surface text-on-surface transition-colors hover:bg-surface-container-low"
        >
          <IconMenu2 size={20} stroke={1.75} />
        </button>

        {open ? (
          <div
            id={menuId}
            role="menu"
            className="absolute top-full right-0 z-50 mt-1.5 min-w-44 rounded border border-outline-variant bg-surface p-1.5 shadow-md [&_a]:w-full [&_a]:justify-start [&_button]:w-full [&_button]:justify-start"
          >
            <div
              className="flex flex-col gap-1"
              onClick={() => setOpen(false)}
            >
              {children()}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
