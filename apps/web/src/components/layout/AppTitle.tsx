import { IconArrowLeft } from "@tabler/icons-react";
import { useBackNavigation } from "./backNavigation";

type AppTitleProps = {
  title: string;
  count?: number | null;
};

/** Optionsleiste title block: optional Zurück, title, optional LP count. */
export function AppTitle({ title, count }: AppTitleProps) {
  const { canGoBack, goBack } = useBackNavigation();

  return (
    <div className="flex w-52 shrink-0 items-center gap-1.5">
      {canGoBack ? (
        <button
          type="button"
          aria-label="Zurück"
          title="Zurück"
          onClick={goBack}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
        >
          <IconArrowLeft size={18} stroke={1.75} />
        </button>
      ) : null}
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <h1 className="min-w-0 truncate text-lg leading-6 font-semibold text-on-surface">
          {title}
        </h1>
        {count != null ? (
          <span className="shrink-0 text-sm font-semibold text-on-surface-variant">
            [{count}]
          </span>
        ) : null}
      </div>
    </div>
  );
}
