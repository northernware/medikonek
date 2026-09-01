import type { ReactNode } from "react";

type Tone = "accent" | "ok" | "warn" | "danger" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent-ink",
  ok: "bg-ok-soft text-ok-ink",
  warn: "bg-warn-soft text-warn-ink",
  danger: "bg-danger-soft text-danger-ink",
  neutral: "bg-surface-muted text-ink-muted",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover shadow-sm",
  secondary: "bg-surface text-ink border border-border hover:border-border-strong hover:bg-surface-muted",
  ghost: "text-ink-muted hover:text-ink hover:bg-surface-muted",
  danger: "bg-danger-soft text-danger-ink hover:bg-danger hover:text-white",
};

export function buttonClass(variant: ButtonVariant = "primary", extra = "") {
  return [
    "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium",
    "transition-colors disabled:cursor-not-allowed disabled:opacity-55",
    VARIANT_CLASS[variant],
    extra,
  ].join(" ");
}

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return (
    <Tag className={`rounded-xl border border-border bg-surface shadow-card ${className}`}>{children}</Tag>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <p className="font-medium">{title}</p>
      {description ? <p className="max-w-sm text-sm text-ink-muted text-pretty">{description}</p> : null}
      {action}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="px-5 py-4">
      <p className="text-xs font-medium tracking-wide text-ink-faint uppercase">{label}</p>
      <p className="tabular mt-1.5 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-muted">{hint}</p> : null}
    </Card>
  );
}

/** Label/value pairs for read-only detail panels. */
export function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-ink-faint uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm text-pretty">{value ?? <span className="text-ink-faint">—</span>}</dd>
    </div>
  );
}

/** A block of prose from a record — preserves the doctor's line breaks. */
export function Prose({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return (
    <div>
      <h3 className="text-xs font-medium tracking-wide text-ink-faint uppercase">{label}</h3>
      <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-pretty">{text}</p>
    </div>
  );
}
