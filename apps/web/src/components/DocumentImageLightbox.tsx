import { IconX } from "@tabler/icons-react";
import { useEffect } from "react";

type DocumentImageLightboxProps = {
  url: string;
  name: string;
  onClose: () => void;
};

export function DocumentImageLightbox(props: DocumentImageLightboxProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        props.onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [props.onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={props.name}
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/70 p-4"
      onClick={props.onClose}
    >
      <button
        type="button"
        onClick={props.onClose}
        className="absolute top-4 right-4 inline-flex h-9 items-center gap-1.5 rounded border border-outline-variant bg-surface px-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low"
      >
        <IconX size={18} stroke={1.75} />
        Schließen
      </button>
      <img
        src={props.url}
        alt={props.name}
        className="max-h-full max-w-full object-contain shadow-lg"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}
