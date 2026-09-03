import type { ReactNode } from "react";

type Tone = "accent" | "ok" | "warn" | "danger" | "neutral";

/**
 * Status is marked, not filled. A badge is a tint plus a coloured dot rather
 * than a saturated pill, so a row of them reads as annotation on the surface
 * instead of a second row of objects competing with the content.
 */
const TONE_CLASS: Record<Tone, string> = {
  accent: "bg-accent-tint text-accent-ink",
  ok: "bg-ok-tint text-ok-ink",
  warn: "bg-warn-tint text-warn-ink",
  danger: "bg-danger-tint text-danger-ink",
  neutral: "bg-surface-muted text-ink-muted",
};

export function Badge({
  tone = "neutral",
  dot = false,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
        dot ? "dot" : "",
        TONE_CLASS[tone],
      ].join(" ")}
    >
      {children}
    </span>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "bg-surface text-ink border border-border hover:border-border-strong hover:bg-surface-muted",
  ghost: "text-ink-muted hover:text-ink hover:bg-surface-muted",
  danger: "text-danger-ink border border-border hover:border-danger hover:bg-danger-tint",
};

export function buttonClass(variant: ButtonVariant = "primary", extra = "") {
  return [
    "inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium",
    "transition-colors disabled:cursor-not-allowed disabled:opacity-55",
    VARIANT_CLASS[variant],
    extra,
  ].join(" ");
}

/**
 * A panel is a hairline container, flat by default. Elevation is spent only on
 * things that genuinely float — a shadow on every block flattens the hierarchy
 * it is meant to create.
 */
export function Card({
  children,
  className = "",
  raised = false,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  raised?: boolean;
  as?: "div" | "section" | "article";
}) {
  return (
    <Tag
      className={[
        "rounded-lg border border-border bg-surface",
        raised ? "shadow-card" : "",
        className,
      ].join(" ")}
    >
      {children}
    </Tag>
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
    <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-2.5">
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold tracking-tight">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0 text-[13px]">{action}</div> : null}
    </div>
  );
}

/**
 * A heading for content that does not need a box around it. Most groupings on a
 * page are sections, not cards; reserving the box for tabular content is what
 * gives the page a rhythm instead of a stack of equal rectangles.
 */
export function SectionTitle({
  title,
  hint,
  action,
}: {
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-4">
      <div className="flex items-baseline gap-2 min-w-0">
        <h2 className="text-[11px] font-semibold tracking-[0.08em] text-ink-faint uppercase">{title}</h2>
        {hint ? <span className="truncate text-xs text-ink-faint">{hint}</span> : null}
      </div>
      {action ? <div className="shrink-0 text-[13px]">{action}</div> : null}
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
        <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.02em] text-balance">{title}</h1>
        {subtitle ? <p className="mt-1 text-[13px] text-ink-muted">{subtitle}</p> : null}
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
    <div className="flex flex-col items-center gap-2.5 px-6 py-12 text-center">
      <p className="text-[13px] font-medium">{title}</p>
      {description ? <p className="max-w-sm text-[13px] text-ink-muted text-pretty">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

/**
 * One figure. `size="hero"` is for the number a page exists to answer; the
 * default is for the supporting row. Figures take the mono face so a column of
 * them lines up.
 */
export function Stat({
  label,
  value,
  hint,
  size = "default",
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  size?: "default" | "hero";
  tone?: Tone;
}) {
  const hero = size === "hero";
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold tracking-[0.09em] text-ink-faint uppercase">{label}</p>
      <p
        className={[
          "nums mt-1.5 font-semibold",
          hero ? "text-[38px] leading-none" : "text-[22px] leading-none",
          tone === "danger" ? "text-danger-ink" : tone === "warn" ? "text-warn-ink" : "text-ink",
        ].join(" ")}
      >
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

/**
 * A row of figures separated by rules rather than gaps. One object with internal
 * divisions reads as a summary; four detached cards read as four things.
 */
export function StatStrip({ children }: { children: ReactNode }) {
  return (
    <Card className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0 [&>*]:px-4 [&>*]:py-3.5">
      {children}
    </Card>
  );
}

/** Label/value pairs for read-only detail panels. */
export function Detail({
  label,
  value,
  className = "",
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-[10px] font-semibold tracking-[0.09em] text-ink-faint uppercase">{label}</dt>
      <dd className="mt-1 text-[13px] text-pretty">{value ?? <span className="text-ink-faint">—</span>}</dd>
    </div>
  );
}

/** A block of prose from a record — preserves the doctor's line breaks. */
export function Prose({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return (
    <div>
      <h3 className="text-[10px] font-semibold tracking-[0.09em] text-ink-faint uppercase">{label}</h3>
      <p className="mt-1 text-[13px] leading-relaxed whitespace-pre-wrap text-pretty">{text}</p>
    </div>
  );
}
