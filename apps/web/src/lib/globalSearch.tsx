import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** LP filters records. EP highlights fields. Same bar in every app. */
export type GlobalSearchMode = "lp" | "ep";

type GlobalSearchContextValue = {
  query: string;
  setQuery: (query: string) => void;
  mode: GlobalSearchMode | null;
  register: (mode: GlobalSearchMode) => () => void;
};

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(
  null,
);

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<GlobalSearchMode | null>(null);

  const register = useCallback((next: GlobalSearchMode) => {
    setMode(next);
    setQuery("");
    return () => {
      setMode(null);
      setQuery("");
    };
  }, []);

  const value = useMemo(
    () => ({ query, setQuery, mode, register }),
    [query, mode, register],
  );

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
    </GlobalSearchContext.Provider>
  );
}

function useGlobalSearchContext(): GlobalSearchContextValue {
  const value = useContext(GlobalSearchContext);
  if (!value) {
    throw new Error("GlobalSearchProvider fehlt");
  }
  return value;
}

export function useRegisterGlobalSearch(mode: GlobalSearchMode) {
  const { register } = useGlobalSearchContext();
  useEffect(() => register(mode), [mode, register]);
}

export function useGlobalSearchQuery(): string {
  return useGlobalSearchContext().query;
}

export function useGlobalSearchControls() {
  const { query, setQuery, mode } = useGlobalSearchContext();
  return { query, setQuery, mode };
}

export function textIncludes(value: string, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;
  return value
    .toLocaleLowerCase("de")
    .includes(trimmed.toLocaleLowerCase("de"));
}

/** LP: a row matches when any visible value contains the query. Empty query matches all. */
export function matchesAnyField(
  query: string,
  parts: readonly string[],
): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;
  return parts.some((part) => textIncludes(part, trimmed));
}

/** EP: a field is highlighted when its label or visible value contains the query. */
export function highlightsField(
  query: string,
  parts: readonly string[],
): boolean {
  const trimmed = query.trim();
  if (!trimmed) return false;
  return parts.some((part) => textIncludes(part, trimmed));
}

export function SearchableField(props: {
  texts: readonly string[];
  className?: string;
  children: ReactNode;
}) {
  const query = useGlobalSearchQuery();
  const mode = useGlobalSearchContext().mode;
  const ref = useRef<HTMLDivElement>(null);
  const searching = mode === "ep" && query.trim().length > 0;
  const match = searching && highlightsField(query, props.texts);

  useEffect(() => {
    if (!match || !ref.current) return;
    const first = document.querySelector("[data-field-match='true']");
    if (first !== ref.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current.scrollIntoView({
      block: "nearest",
      behavior: reduce ? "auto" : "smooth",
    });
  }, [match, query]);

  return (
    <div
      ref={ref}
      data-field-match={match ? "true" : undefined}
      className={[
        "scroll-mt-20 transition-[opacity,background-color,box-shadow] duration-150",
        props.className ?? "",
        searching && match ? "rounded bg-primary/10 ring-2 ring-primary" : "",
        searching && !match ? "opacity-40" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {props.children}
    </div>
  );
}
