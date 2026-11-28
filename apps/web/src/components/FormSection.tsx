import {
  IconChevronDown,
  IconChevronRight,
  type Icon,
} from "@tabler/icons-react";
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type DragEventHandler,
  type ReactNode,
} from "react";
import {
  useGlobalSearchControls,
  useGlobalSearchQuery,
} from "../lib/globalSearch";

type FormSectionProps = {
  headingId: string;
  title: ReactNode;
  icon: Icon;
  /** Defaults to open. Pass false for Dokumente / Sonstiges. */
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
  onDragEnter?: DragEventHandler<HTMLElement>;
  onDragLeave?: DragEventHandler<HTMLElement>;
  onDragOver?: DragEventHandler<HTMLElement>;
  onDrop?: DragEventHandler<HTMLElement>;
};

/** EP group: collapsible header with icon, uppercase title, and chevron. */
export function FormSection(props: FormSectionProps) {
  const {
    headingId,
    title,
    icon: SectionIcon,
    defaultOpen = true,
    className,
    children,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop,
  } = props;

  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  /** Query for which the user manually collapsed; skip auto-open until it changes. */
  const dismissedQueryRef = useRef<string | null>(null);
  const { mode } = useGlobalSearchControls();
  const query = useGlobalSearchQuery();

  useLayoutEffect(() => {
    if (mode !== "ep") return;
    const trimmed = query.trim();
    if (!trimmed) {
      dismissedQueryRef.current = null;
      return;
    }
    if (open) return;
    if (dismissedQueryRef.current === trimmed) return;
    const section = sectionRef.current;
    if (!section?.querySelector("[data-field-match='true']")) return;
    setOpen(true);
  }, [query, mode, open]);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      if (!next && mode === "ep" && query.trim()) {
        dismissedQueryRef.current = query.trim();
      }
      return next;
    });
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby={headingId}
      className={["flex flex-col", className].filter(Boolean).join(" ")}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <h2 id={headingId} className="border-b border-outline-variant pb-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
          className="flex w-full items-center gap-2 text-left text-sm font-semibold tracking-wide text-on-surface uppercase"
        >
          <SectionIcon
            size={18}
            stroke={1.75}
            className="shrink-0 text-primary"
          />
          <span className="min-w-0 flex-1">{title}</span>
          {open ? (
            <IconChevronDown
              size={18}
              stroke={1.75}
              className="shrink-0 text-on-surface-variant"
              aria-hidden
            />
          ) : (
            <IconChevronRight
              size={18}
              stroke={1.75}
              className="shrink-0 text-on-surface-variant"
              aria-hidden
            />
          )}
        </button>
      </h2>

      <div
        id={panelId}
        role="region"
        aria-labelledby={headingId}
        className={[
          "grid transition-[grid-template-rows] duration-[160ms] ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        ].join(" ")}
      >
        <div
          className="min-h-0 overflow-hidden"
          inert={!open ? true : undefined}
          aria-hidden={!open}
        >
          <div className="flex flex-col gap-4 pt-4">{children}</div>
        </div>
      </div>
    </section>
  );
}
