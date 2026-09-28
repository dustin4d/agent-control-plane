import { useState, type ReactNode } from "react";

interface Props {
  title: string;
  value: unknown;
  stamp?: ReactNode;
  copy?: boolean;
  className?: string;
}

/** Real JSON, pretty printed, 80-column wrap with overflow auto. */
export function JsonBlock({ title, value, stamp, copy, className = "" }: Props) {
  const [copied, setCopied] = useState(false);
  const text = value === undefined ? "" : typeof value === "string" ? value : JSON.stringify(value, null, 2);

  const onCopy = () => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <div className={`relative flex min-h-0 flex-col rounded border border-line bg-panel2 ${className}`}>
      <div className="flex items-center justify-between border-b border-line px-2 py-1">
        <span className="panel-title">{title}</span>
        {copy && text && (
          <button type="button" className="text-[11px] text-muted hover:text-ink" onClick={onCopy} aria-label={`Copy ${title}`}>
            {copied ? "copied" : "copy"}
          </button>
        )}
      </div>
      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-2 font-mono text-log text-ink/90 [max-width:80ch]">
        {text || <span className="text-muted">empty</span>}
      </pre>
      {stamp && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {stamp}
        </div>
      )}
    </div>
  );
}

export function Stamp({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="-rotate-6 rounded border-2 px-2 py-0.5 font-mono text-[12px] font-bold tracking-widest animate-fadein"
      style={{ color, borderColor: color, backgroundColor: "#0B0F14CC" }}
    >
      {text}
    </span>
  );
}
