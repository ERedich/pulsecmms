import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "caption",
  ],
  attributes: {
    ...defaultSchema.attributes,
    table: [],
    thead: [],
    tbody: [],
    tr: [],
    th: ["align", "colspan", "rowspan"],
    td: ["align", "colspan", "rowspan"],
    caption: [],
  },
};

const markdownComponents: Components = {
  table: ({ children }) => (
    <div className="ai-table-scroll my-3 overflow-x-auto rounded border border-outline-variant/70">
      <table className="min-w-full border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-surface-container-high text-on-surface">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="bg-surface-container-lowest">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="border-b border-outline-variant/50 last:border-b-0">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 font-semibold whitespace-nowrap">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 align-top text-on-surface-variant">{children}</td>
  ),
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-on-surface">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => (
    <code className="rounded bg-surface-container px-1 py-0.5 text-[0.85em]">
      {children}
    </code>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-primary underline underline-offset-2"
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  ),
};

type AiMessageContentProps = {
  text: string;
};

export function AiMessageContent({ text }: AiMessageContentProps) {
  return (
    <div className="ai-message-content text-sm text-on-surface">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
        components={markdownComponents}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
