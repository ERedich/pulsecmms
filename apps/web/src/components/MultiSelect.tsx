import { IconCheck, IconChevronDown, IconX } from "@tabler/icons-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { tokenTone } from "../lib/tokenTone";
import { useAnchoredListbox } from "./anchoredListbox";
import type { ComboboxOption } from "./Combobox";

type MultiSelectProps = {
  id: string;
  label: string;
  values: readonly string[];
  onChange: (values: string[]) => void;
  options: readonly ComboboxOption[];
  emptyText?: string;
};

function includesQuery(option: ComboboxOption, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase("de");
  if (!needle) return true;
  const haystack = [option.label, option.value, ...(option.keywords ?? [])]
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
): number {
  const current = options[activeIndex];
  if (current && !current.disabled) return activeIndex;
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

export function MultiSelect(props: MultiSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeOptionRef = useRef<HTMLLIElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filtering, setFiltering] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const listId = `${props.id}-listbox`;
  const emptyText = props.emptyText ?? "Keine Treffer";
  const optionByValue = useMemo(() => {
    const map = new Map<string, ComboboxOption>();
    for (const option of props.options) map.set(option.value, option);
    return map;
  }, [props.options]);

  const visibleOptions = useMemo(() => {
    if (!filtering) return props.options;
    return props.options.filter((option) => includesQuery(option, query));
  }, [filtering, props.options, query]);

  const activeOptionIndex = resolveActiveIndex(visibleOptions, activeIndex);
  const floated = open || query.length > 0 || props.values.length > 0;

  const listbox = useAnchoredListbox(open, rootRef);

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
    setFiltering(false);
    setActiveIndex(-1);
    setOpen(true);
  }

  function closeList() {
    setOpen(false);
    setFiltering(false);
    setQuery("");
    setActiveIndex(-1);
  }

  function toggleValue(value: string) {
    props.onChange(
      props.values.includes(value)
        ? props.values.filter((item) => item !== value)
        : [...props.values, value],
    );
    setQuery("");
    setFiltering(false);
    setActiveIndex(-1);
    setOpen(true);
  }

  function commit(option: ComboboxOption) {
    if (option.disabled) return;
    toggleValue(option.value);
    inputRef.current?.focus();
  }

  function removeValue(value: string) {
    props.onChange(props.values.filter((item) => item !== value));
  }

  function onContainerMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("button")) {
      event.preventDefault();
      return;
    }
    if (target === inputRef.current) return;
    event.preventDefault();
    inputRef.current?.focus();
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
          resolveActiveIndex(visibleOptions, current),
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
      const option = visibleOptions[activeOptionIndex];
      if (option && !option.disabled) commit(option);
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      closeList();
      return;
    }

    if (
      event.key === "Backspace" &&
      query.length === 0 &&
      props.values.length > 0
    ) {
      const last = props.values[props.values.length - 1];
      if (last) removeValue(last);
    }
  }

  const activeOptionId =
    open && activeOptionIndex >= 0
      ? `${props.id}-opt-${activeOptionIndex}`
      : undefined;

  return (
    <div ref={rootRef} className="relative">
      <div
        className="relative rounded border border-outline-variant bg-surface-container-lowest focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"
        onMouseDown={onContainerMouseDown}
      >
        <label
          htmlFor={props.id}
          className={[
            "pointer-events-none absolute left-3 origin-left font-medium text-on-surface-variant",
            "transition-[top,translate,scale,background-color,padding] duration-[160ms] ease-out motion-reduce:transition-none",
            floated
              ? "top-0 -translate-y-1/2 scale-75 bg-background px-1 text-sm"
              : "top-1/2 -translate-y-1/2 text-sm",
          ].join(" ")}
        >
          {props.label}
        </label>
        <div className="flex min-h-[42px] flex-wrap items-center gap-1 py-1.5 pr-10 pl-2.5">
          {props.values.map((value) => {
            const option = optionByValue.get(value);
            const tone = tokenTone(option?.color);
            return (
              <span
                key={value}
                title={option?.label ?? value}
                className={[
                  "inline-flex h-6 max-w-full items-center gap-0.5 rounded pr-0.5 pl-2 text-xs font-semibold",
                  tone ? "" : "bg-surface-container-high text-on-surface",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={tone ?? undefined}
              >
                <span className="truncate">{value}</span>
                <button
                  type="button"
                  className={[
                    "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded",
                    tone
                      ? "hover:bg-current/15"
                      : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface",
                  ].join(" ")}
                  aria-label={`${value} entfernen`}
                  onClick={() => removeValue(value)}
                >
                  <IconX size={12} stroke={2} />
                </button>
              </span>
            );
          })}
          <input
            ref={inputRef}
            id={props.id}
            role="combobox"
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setFiltering(true);
              setActiveIndex(-1);
              setOpen(true);
            }}
            onFocus={openList}
            onBlur={closeList}
            onClick={() => {
              if (!open) openList();
            }}
            onKeyDown={onKeyDown}
            autoComplete="off"
            spellCheck={false}
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={activeOptionId}
            className="min-w-16 flex-1 bg-transparent py-1 text-sm text-on-surface outline-none"
          />
        </div>
        <div className="absolute inset-y-0 right-0 z-10 flex items-center pr-1">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            aria-label={open ? "Liste schließen" : "Liste öffnen"}
            aria-expanded={open}
            aria-controls={listId}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (open) {
                closeList();
                return;
              }
              openList();
              inputRef.current?.focus();
            }}
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
      {open && listbox
        ? createPortal(
        <ul
          id={listId}
          role="listbox"
          aria-label={props.label}
          aria-multiselectable="true"
          onMouseDown={(event) => event.preventDefault()}
          className="z-50 overflow-auto overscroll-contain rounded border border-outline-variant bg-surface-container-lowest py-1 shadow-lg"
          style={{
            position: "fixed",
            left: listbox.left,
            width: listbox.width,
            maxHeight: listbox.maxHeight,
            top: listbox.openUp ? undefined : listbox.top,
            bottom: listbox.openUp
              ? window.innerHeight - listbox.top
              : undefined,
          }}
        >
          {visibleOptions.length === 0 ? (
            <li className="px-3.5 py-2 text-sm text-on-surface-variant">
              {emptyText}
            </li>
          ) : (
            visibleOptions.map((option, index) => {
              const selected = props.values.includes(option.value);
              const active = index === activeOptionIndex;
              return (
                <li
                  key={option.value}
                  id={`${props.id}-opt-${index}`}
                  role="option"
                  aria-selected={selected}
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
                    selected ? "font-medium" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <IconCheck
                    size={16}
                    stroke={2}
                    aria-hidden
                    className={
                      selected ? "shrink-0 text-primary" : "shrink-0 opacity-0"
                    }
                  />
                  <span className="min-w-0">{option.label}</span>
                </li>
              );
            })
          )}
        </ul>,
          document.body,
        )
        : null}
    </div>
  );
}
