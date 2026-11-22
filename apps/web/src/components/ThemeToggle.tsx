import { IconMoon, IconSun } from "@tabler/icons-react";
import { toggleTheme, useTheme } from "../lib/theme";

type ThemeToggleProps = {
  /** Extra classes for placement (e.g. absolute on login). */
  className?: string;
  /** Stronger outline for use over photographic backgrounds. */
  outlined?: boolean;
};

export function ThemeToggle({ className, outlined = false }: ThemeToggleProps) {
  const theme = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Helles Design" : "Dunkles Design"}
      title={isDark ? "Helles Design" : "Dunkles Design"}
      className={[
        "relative flex h-9 w-9 items-center justify-center rounded transition-colors",
        outlined
          ? "border border-white/40 bg-black/40 text-white hover:bg-black/55"
          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <IconSun
        size={20}
        stroke={1.75}
        aria-hidden
        className={[
          "absolute transition-opacity duration-300 ease-in-out motion-reduce:transition-none",
          isDark ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />
      <IconMoon
        size={20}
        stroke={1.75}
        aria-hidden
        className={[
          "absolute transition-opacity duration-300 ease-in-out motion-reduce:transition-none",
          isDark ? "opacity-0" : "opacity-100",
        ].join(" ")}
      />
    </button>
  );
}
