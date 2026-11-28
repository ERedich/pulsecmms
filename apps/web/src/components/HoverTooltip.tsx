import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

type HoverTooltipProps = {
  label: string;
  /** Delay before the tip appears. Default 500ms. */
  delayMs?: number;
  children: ReactNode;
  className?: string;
};

/**
 * Shows `label` after a hover delay. Hides on leave or press.
 * Child controls stay interactive; the tip is decorative (`role="tooltip"`).
 */
export function HoverTooltip({
  label,
  delayMs = 500,
  children,
  className,
}: HoverTooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);
  const tooltipId = useId();

  function clearTimer() {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function hide() {
    clearTimer();
    setVisible(false);
  }

  function onPointerEnter() {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      setVisible(true);
      timerRef.current = null;
    }, delayMs);
  }

  useEffect(() => () => clearTimer(), []);

  return (
    <span
      className={["relative inline-flex min-w-0", className].filter(Boolean).join(" ")}
      onPointerEnter={onPointerEnter}
      onPointerLeave={hide}
      onPointerDown={hide}
      aria-describedby={visible ? tooltipId : undefined}
    >
      {children}
      {visible ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute top-full left-1/2 z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded border border-outline-variant bg-surface px-2 py-1 text-xs font-medium text-on-surface shadow-md"
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
