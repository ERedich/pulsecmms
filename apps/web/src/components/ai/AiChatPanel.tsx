import { useChat } from "@ai-sdk/react";
import {
  IconArrowUp,
  IconPlus,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { getAccessToken } from "../../lib/auth";
import { AiMessageContent } from "./AiMessageContent";

const EXAMPLE_PROMPTS = [
  "Welche Wartungsobjekte gibt es und wozu gehören sie?",
  "Liste die Kostenstellen als Tabelle.",
  "Welche Mitarbeiter sind angelegt?",
  "Durchsuche die Dokumente nach Handbüchern.",
];

type AiChatPanelProps = {
  open: boolean;
  onClose: () => void;
};

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function AiChatPanel({ open, onClose }: AiChatPanelProps) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/chat",
        headers: () => {
          const token = getAccessToken();
          const headers: Record<string, string> = {};
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }
          return headers;
        },
      }),
    [],
  );

  const { messages, sendMessage, status, setMessages, error, stop } = useChat({
    transport,
  });

  const [input, setInput] = useState("");
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!open) return;
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, status, open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onWindowKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onWindowKeyDown);
    return () => window.removeEventListener("keydown", onWindowKeyDown);
  }, [open, onClose]);

  function submitPrompt(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    void sendMessage({ text: trimmed });
    setInput("");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    submitPrompt(input);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitPrompt(input);
    }
  }

  const showThinking =
    status === "submitted" ||
    (status === "streaming" &&
      (messages.length === 0 ||
        messages[messages.length - 1]?.role !== "assistant" ||
        messageText(messages[messages.length - 1]!).length === 0));

  function startNewChat() {
    if (busy) stop();
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <div
      className={[
        "fixed inset-0 z-[120] flex justify-end lg:left-72",
        open ? "pointer-events-auto" : "pointer-events-none invisible",
      ].join(" ")}
      aria-hidden={!open}
      role="dialog"
      aria-modal={open}
      aria-label="Pulse KI"
    >
      <button
        type="button"
        aria-label="KI-Chat schließen"
        className="absolute inset-0 bg-black/35 lg:bg-black/20"
        onClick={onClose}
      />

      <section className="relative z-[1] flex h-full w-full max-w-2xl flex-col border-l border-outline-variant/70 bg-surface shadow-2xl">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-outline-variant/70 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
            <IconSparkles size={18} stroke={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-on-surface">
              Pulse KI
            </h2>
            <p className="truncate text-[11px] text-on-surface-variant">
              Read-only Assistent für alle Apps und Dokumente
            </p>
          </div>
          <button
            type="button"
            onClick={startNewChat}
            aria-label="Neuer Chat"
            title="Neuer Chat"
            className="flex h-8 w-8 items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <IconPlus size={18} stroke={1.75} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            title="Schließen"
            className="flex h-8 w-8 items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <IconX size={18} stroke={1.75} />
          </button>
        </header>

        <div
          ref={scrollerRef}
          className="flex-1 overflow-y-auto px-4 py-5"
        >
          {messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-md flex-col justify-center gap-5">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <IconSparkles size={24} stroke={1.75} />
                </div>
                <h3 className="text-base font-semibold text-on-surface">
                  Wie kann ich helfen?
                </h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Stelle Fragen zu Mandanten, Assets, Personen und Dokumenten.
                  In Version 1 liest die KI nur.
                </p>
              </div>
              <div className="grid gap-2">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => submitPrompt(prompt)}
                    className="rounded border border-outline-variant/70 bg-surface-container-low px-3 py-2.5 text-left text-sm text-on-surface transition-colors hover:bg-surface-container"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-2xl flex-col gap-4">
              {messages.map((message) => {
                const text = messageText(message);
                if (!text && message.role === "assistant") {
                  return null;
                }
                const isUser = message.role === "user";
                return (
                  <div
                    key={message.id}
                    className={[
                      "flex",
                      isUser ? "justify-end" : "justify-start",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "max-w-[92%] rounded-2xl px-3.5 py-2.5",
                        isUser
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container text-on-surface",
                      ].join(" ")}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {text}
                        </p>
                      ) : (
                        <AiMessageContent text={text} />
                      )}
                    </div>
                  </div>
                );
              })}

              {showThinking ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-surface-container px-3.5 py-2.5 text-sm text-on-surface-variant">
                    Denke nach…
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="rounded border border-error/40 bg-error-container px-3 py-2 text-sm text-on-error-container">
                  Die Anfrage ist fehlgeschlagen. Bitte erneut versuchen.
                </div>
              ) : null}
            </div>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          className="shrink-0 border-t border-outline-variant/70 bg-surface px-4 py-3"
        >
          <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-2xl border border-outline-variant/70 bg-surface-container-low px-3 py-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Frage an Pulse KI…"
              disabled={busy}
              className="max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent py-2 text-sm text-on-surface outline-none placeholder:text-on-surface-variant disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || input.trim().length === 0}
              aria-label="Senden"
              className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition-opacity disabled:opacity-40"
            >
              <IconArrowUp size={18} stroke={2} />
            </button>
          </div>
          <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-on-surface-variant">
            Die KI kann Fehler machen. Prüfe wichtige Angaben in den Apps.
          </p>
        </form>
      </section>
    </div>
  );
}
