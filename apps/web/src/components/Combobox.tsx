import { IconCheck, IconChevronDown, IconX } from "@tabler/icons-react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { tokenTone } from "../lib/tokenTone";

export type ComboboxOption = {
  value: string;
  label: string;
  disabled?: boolean;
  keywords?: readonly string[];
  /** Hex color for option swatch / MultiSelect tokens. */
  color?: string;
  /** Optional leading icon in the option list. */
  icon?: ElementType;
};

type ComboboxProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly ComboboxOption[];
  required?: boolean;
  emptyText?: string;
};

const FLOAT_LABEL =
  "peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-focus:bg-background peer-focus:px-1 " +
  "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 " +
  "peer-[:not(:placeholder-shown)]:scale-75 peer-[:not(:placeholder-shown)]:bg-background " +
  "peer-[:not(:placeholder-shown)]:px-1";

function includesQuery(option: ComboboxOption, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase("de");
  if (!needle) return true;
  const haystack = [option.label, ...(option.keywords ?? [])]
    .join("\n")
    .toLocaleLowerCase("de");
  return haystack.includes(needle);
}

function firstEnabled(options: readonly ComboboxOption[]): number {
  return options.findIndex((option) => !option.disabled);
}

function lastEnabled(options: readonly ComboboxOption[]): number {
  for (let index = options.length - 1; index >= 0; index -= 1) {
    if (!options[index]?.disabled) return index;
  }
  return -1;
}

function resolveActiveIndex(
  options: readonly ComboboxOption[],
  activeIndex: number,
  selectedValue: string,
): number {
  const current = options[activeIndex];
  if (current && !current.disabled) return activeIndex;
  const selectedIndex = options.findIndex(
    (option) => option.value === selectedValue && !option.disabled,
  );
  if (selectedIndex >= 0) return selectedIndex;
  return firstEnabled(options);
}

function moveEnabled(
  options: readonly ComboboxOption[],
  from: number,
  direction: 1 | -1,
): number {
  if (from < 0) {
    return direction === 1 ? firstEnabled(options) : lastEnabled(options);
  }
  for (let step = 1; step <= options.length; step += 1) {
    const index = (from + direction * step + options.length) % options.length;
    if (!options[index]?.disabled) return index;
  }
  return -1;
}

export function Combobox(props: ComboboxProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeOptionRef = useRef<HTMLLIElement>(null);
  const ignoreNextFocus = useRef(false);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filtering, setFiltering] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [openUp, setOpenUp] = useState(false);

  const selected = props.options.find((option) => option.value === props.value);
  const selectedLabel = selected?.label ?? "";
  const listId = `${props.id}-listbox`;
  const emptyText = props.emptyText ?? "Keine Treffer";

  const visibleOptions = useMemo(() => {
    if (!filtering) return props.options;
    return props.options.filter((option) => includesQuery(option, query));
  }, [filtering, props.options, query]);

  const activeOptionIndex = resolveActiveIndex(
    visibleOptions,
    activeIndex,
    props.value,
  );

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setOpenUp(spaceBelow < 280 && rect.top > spaceBelow);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const option = activeOptionRef.current;
    const list = option?.parentElement;
    if (!option || !list) return;
    const optionTop = option.offsetTop;
    const optionBottom = optionTop + option.offsetHeight;
    if (optionTop < list.scrollTop) {
      list.scrollTop = optionTop;
    } else if (optionBottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = optionBottom - list.clientHeight;
    }
  }, [open, activeOptionIndex, visibleOptions]);

  function openList() {
    setQuery(selectedLabel);
    setFiltering(false);
    setActiveIndex(-1);
    setOpen(true);
  }

  function closeList() {
    setFiltering(false);
    setActiveIndex(-1);
    setOpen(false);
  }

  function commit(option: ComboboxOption) {
    if (option.disabled) return;
    props.onChange(option.value);
    setQuery(option.label);
    closeList();
  }

  function onFocus() {
    if (ignoreNextFocus.current) {
      ignoreNextFocus.current = false;
      setOpen(true);
      return;
    }
    openList();
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function onBlur() {
    if (filtering && query.trim() === "") {
      props.onChange("");
    }
    closeList();
  }

  function onChangeQuery(next: string) {
    setQuery(next);
    setFiltering(true);
    setActiveIndex(-1);
    setOpen(true);
  }

  function onToggleMouseDown(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  function onToggleClick() {
    if (open) {
      closeList();
      return;
    }
    openList();
    inputRef.current?.focus();
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function onClearMouseDown(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  function onClearClick() {
    const input = inputRef.current;
    if (document.activeElement !== input) {
      ignoreNextFocus.current = true;
    }
    props.onChange("");
    setQuery("");
    setFiltering(true);
    setActiveIndex(-1);
    setOpen(true);
    input?.focus();
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      if (!open) {
        openList();
        return;
      }
      setActiveIndex((current) =>
        moveEnabled(
          visibleOptions,
          resolveActiveIndex(visibleOptions, current, props.value),
          direction,
        ),
      );
      return;
    }

    if ((event.key === "Home" || event.key === "End") && open) {
      event.preventDefault();
      setActiveIndex(
        event.key === "Home"
          ? firstEnabled(visibleOptions)
          : lastEnabled(visibleOptions),
      );
      return;
    }

    if (event.key === "Enter" && open) {
      event.preventDefault();
      const index = resolveActiveIndex(
        visibleOptions,
        activeIndex,
        props.value,
      );
      const option = visibleOptions[index];
      if (option && !option.disabled) {
        commit(option);
        return;
      }
      if (query.trim() === "") {
        props.onChange("");
        closeList();
      }
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      closeList();
    }
  }

  const accent = props.required
    ? "border border-error/60 focus:border-error focus:ring-error"
    : "border border-outline-variant focus:border-primary focus:ring-primary";
  const hasValue = props.value.length > 0;
  const activeOptionId =
    open && activeOptionIndex >= 0
      ? `${props.id}-opt-${activeOptionIndex}`
      : undefined;

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={props.id}
          role="combobox"
          type="text"
          value={open ? query : selectedLabel}
          onChange={(event) => onChangeQuery(event.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          onClick={() => {
            if (!open) openList();
          }}
          onKeyDown={onKeyDown}
          required={props.required}
          autoComplete="off"
          spellCheck={false}
          placeholder=" "
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={activeOptionId}
          className={[
            "peer block w-full rounded bg-surface-container-lowest py-2.5 pl-3.5 text-sm text-on-surface focus:ring-1 focus:outline-none",
            hasValue ? "pr-[4.5rem]" : "pr-10",
            accent,
          ].join(" ")}
        />
        <label
          htmlFor={props.id}
          className={[
            "pointer-events-none absolute top-1/2 left-3 origin-left -translate-y-1/2",
            "text-sm font-medium text-on-surface-variant",
            "transition-[top,translate,scale,background-color,padding] duration-[160ms] ease-out motion-reduce:transition-none",
            FLOAT_LABEL,
          ].join(" ")}
        >
          {props.label}
          {props.required ? (
            <span className="text-error" aria-hidden>
              {" "}
              *
            </span>
          ) : null}
        </label>
        <div className="absolute inset-y-0 right-0 z-10 flex items-center pr-1">
          {hasValue ? (
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              aria-label={`${props.label} leeren`}
              onMouseDown={onClearMouseDown}
              onClick={onClearClick}
            >
              <IconX size={16} stroke={2} />
            </button>
          ) : null}
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            aria-label={open ? "Liste schließen" : "Liste öffnen"}
            aria-expanded={open}
            aria-controls={listId}
            onMouseDown={onToggleMouseDown}
            onClick={onToggleClick}
          >
            <IconChevronDown
              size={16}
              stroke={2}
              className={[
                "transition-transform duration-150 motion-reduce:transition-none",
                open ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>
        </div>
      </div>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={props.label}
          onMouseDown={(event) => event.preventDefault()}
          className={[
            "absolute right-0 left-0 z-30 max-h-60 overflow-auto overscroll-contain rounded border border-outline-variant bg-surface-container-lowest py-1 shadow-lg",
            openUp ? "bottom-full mb-1" : "top-full mt-1",
          ].join(" ")}
        >
          {visibleOptions.length === 0 ? (
            <li className="px-3.5 py-2 text-sm text-on-surface-variant">
              {emptyText}
            </li>
          ) : (
            visibleOptions.map((option, index) => {
              const selectedOption = option.value === props.value;
              const active = index === activeOptionIndex;
              const tone = tokenTone(option.color);
              const OptionIcon = option.icon;
              return (
                <li
                  key={option.value}
                  id={`${props.id}-opt-${index}`}
                  role="option"
                  aria-selected={selectedOption}
                  aria-disabled={option.disabled ? true : undefined}
                  ref={active ? activeOptionRef : undefined}
                  onMouseEnter={() => {
                    if (!option.disabled) setActiveIndex(index);
                  }}
                  onClick={() => commit(option)}
                  className={[
                    "flex items-center gap-2 px-3.5 py-2 text-sm",
                    option.disabled
                      ? "text-on-surface-variant/70"
                      : "cursor-pointer text-on-surface",
                    !option.disabled && active ? "bg-surface-container" : "",
                    selectedOption ? "font-medium" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <IconCheck
                    size={16}
                    stroke={2}
                    aria-hidden
                    className={
                      selectedOption
                        ? "shrink-0 text-primary"
                        : "shrink-0 opacity-0"
                    }
                  />
                  {tone || OptionIcon ? (
                    <span
                      className={[
                        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded",
                        tone ? "" : "bg-surface-container-high text-on-surface",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={tone ?? undefined}
                      aria-hidden
                    >
                      {OptionIcon ? (
                        <OptionIcon size={14} stroke={1.75} />
                      ) : (
                        <span className="h-2.5 w-2.5 rounded-full bg-current opacity-40" />
                      )}
                    </span>
                  ) : null}
                  <span className="min-w-0">{option.label}</span>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
