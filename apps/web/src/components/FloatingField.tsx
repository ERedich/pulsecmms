import type { ReactNode } from "react";

type FloatingFieldBase = {
  id: string;
  label: string;
  value: string;
  required?: boolean;
  autoComplete?: string;
  type?: "text" | "email" | "password" | "number";
  min?: number | string;
  step?: number | string;
  /** Extra classes on the input (e.g. right padding for an icon button). */
  inputClassName?: string;
  /** Content absolutely positioned inside the field (e.g. show-password). */
  endAdornment?: ReactNode;
  /** Hint shown under the field, outside the floating label. */
  hint?: string;
};

type FloatingFieldProps = FloatingFieldBase &
  (
    | { readOnly: true; onChange?: (value: string) => void }
    | { readOnly?: false; onChange: (value: string) => void }
  );

const FLOAT_LABEL =
  "peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-focus:bg-background peer-focus:px-1 " +
  "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 " +
  "peer-[:not(:placeholder-shown)]:scale-75 peer-[:not(:placeholder-shown)]:bg-background " +
  "peer-[:not(:placeholder-shown)]:px-1";

export function FloatingField(props: FloatingFieldProps) {
  const accent =
    props.required && !props.readOnly
      ? "border border-error/60 focus:border-error focus:ring-error"
      : "border border-outline-variant focus:border-primary focus:ring-primary";

  return (
    <div>
      <div className="relative">
        <input
          id={props.id}
          type={props.type ?? "text"}
          value={props.value}
          onChange={
            props.readOnly
              ? undefined
              : (e) => props.onChange(e.target.value)
          }
          required={props.required && !props.readOnly}
          readOnly={props.readOnly}
          tabIndex={props.readOnly ? -1 : undefined}
          autoComplete={props.autoComplete}
          min={props.type === "number" ? props.min : undefined}
          step={props.type === "number" ? (props.step ?? "any") : undefined}
          placeholder=" "
          className={[
            "peer block w-full rounded bg-surface-container-lowest py-2.5 pl-3.5 text-sm text-on-surface focus:ring-1 focus:outline-none",
            props.endAdornment ? "pr-10" : "pr-3.5",
            accent,
            props.inputClassName ?? "",
          ]
            .filter(Boolean)
            .join(" ")}
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
          {props.required && !props.readOnly ? (
            <span className="text-error" aria-hidden>
              {" "}
              *
            </span>
          ) : null}
        </label>
        {props.endAdornment}
      </div>
      {props.hint ? (
        <p className="mt-1.5 text-xs text-on-surface-variant">{props.hint}</p>
      ) : null}
    </div>
  );
}
