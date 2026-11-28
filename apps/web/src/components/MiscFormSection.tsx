import {
  IconCheck,
  IconCopy,
  IconDots,
  type Icon,
} from "@tabler/icons-react";
import { useEffect, useState, type ReactNode } from "react";
import type { SiteRef } from "../lib/auth";
import { SearchableField } from "../lib/globalSearch";
import { tokenTone } from "../lib/tokenTone";
import { FormSection } from "./FormSection";

type MiscFormSectionProps = {
  headingId: string;
  /** Record uid; null/undefined in create mode shows "—". */
  uid?: string | null;
  /** When set, shows Mandant as a color token. Omit for sites. */
  site?: Pick<SiteRef, "key" | "name" | "colorCode"> | null;
  icon?: Icon;
  /** Extra fields before GUID (e.g. Farbcode on Mandanten). */
  children?: ReactNode;
};

function SiteKeyToken(props: {
  site: Pick<SiteRef, "key" | "name" | "colorCode">;
}) {
  const tone = tokenTone(props.site.colorCode);
  return (
    <span
      title={`${props.site.key} — ${props.site.name}`}
      className={[
        "inline-flex h-6 max-w-full items-center rounded px-2 text-xs font-semibold",
        tone ? "" : "bg-surface-container-high text-on-surface",
      ]
        .filter(Boolean)
        .join(" ")}
      style={tone ?? undefined}
    >
      {props.site.key}
    </span>
  );
}

function GuidField(props: { value: string; canCopy: boolean }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copyGuid() {
    if (!props.canCopy) return;
    try {
      await navigator.clipboard.writeText(props.value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <SearchableField texts={["GUID", props.value]}>
      <span className="mb-1.5 block text-xs font-medium leading-4 text-on-surface-variant">
        GUID
      </span>
      <div className="relative flex min-h-11 items-center rounded border border-outline-variant/70 bg-surface-container-low py-2.5 pr-10 pl-3.5">
        <p className="min-w-0 flex-1 truncate font-mono text-sm text-on-surface">
          {props.value}
        </p>
        <button
          type="button"
          disabled={!props.canCopy}
          onClick={() => void copyGuid()}
          aria-label={copied ? "GUID kopiert" : "GUID kopieren"}
          title={copied ? "Kopiert" : "Kopieren"}
          className="absolute inset-y-0 right-0 z-10 flex items-center pr-3 text-on-surface-variant hover:text-on-surface disabled:pointer-events-none disabled:opacity-50"
        >
          {copied ? (
            <IconCheck size={16} stroke={2} className="text-primary" />
          ) : (
            <IconCopy size={16} stroke={2} />
          )}
        </button>
      </div>
    </SearchableField>
  );
}

/** EP group Sonstiges: Mandant token (optional) + GUID; default collapsed. */
export function MiscFormSection(props: MiscFormSectionProps) {
  const {
    headingId,
    uid = null,
    site = null,
    icon = IconDots,
    children,
  } = props;
  const canCopy = Boolean(uid && uid.length > 0);
  const guidValue = canCopy && uid ? uid : "—";

  return (
    <FormSection
      headingId={headingId}
      title="Sonstiges"
      icon={icon}
      defaultOpen={false}
    >
      <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {site ? (
          <SearchableField texts={["Mandant", site.key, site.name]}>
            <span className="mb-1.5 block text-xs font-medium leading-4 text-on-surface-variant">
              Mandant
            </span>
            <div className="flex min-h-11 items-center rounded border border-outline-variant/70 bg-surface-container-low px-3.5 py-2.5">
              <SiteKeyToken site={site} />
            </div>
          </SearchableField>
        ) : null}
        {children}
        <GuidField value={guidValue} canCopy={canCopy} />
      </div>
    </FormSection>
  );
}
