"use client";

import { useId, useMemo, useRef, useState } from "react";
import { ALLERGY_SEVERITY_LABELS, type SuggestionGroup } from "@/lib/clinical";

export type ClinicalItem = {
  label: string;
  reaction: string;
  severity: string;
  notes: string;
};

export const BLANK_ITEM: ClinicalItem = { label: "", reaction: "", severity: "", notes: "" };

type Status = "RECORDED" | "NONE_KNOWN" | "UNKNOWN";

const CONTROL =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink " +
  "placeholder:text-ink-faint transition-colors hover:border-border-strong focus:border-accent";

/**
 * A search-and-tag picker for a clinical list.
 *
 * The catalogue is a shortcut, never a limit: whatever is typed can be added,
 * so a doctor is not blocked by a missing entry. "None known" and "Not asked"
 * are separate answers rather than an empty list, because clinically they are
 * different facts — the value travels in a hidden status field.
 */
export function ClinicalPicker({
  legend,
  fieldName,
  statusName,
  groups,
  placeholder,
  noneLabel,
  defaultStatus,
  defaultItems,
  withAllergyDetail = false,
  error,
}: {
  legend: string;
  /** Prefix for the repeated fields, e.g. "allergy" → `allergy.label`. */
  fieldName: string;
  statusName: string;
  groups: SuggestionGroup[];
  placeholder: string;
  noneLabel: string;
  defaultStatus: Status;
  defaultItems: ClinicalItem[];
  /** Allergies additionally capture reaction, severity and notes per item. */
  withAllergyDetail?: boolean;
  error?: string[];
}) {
  const [status, setStatus] = useState<Status>(defaultStatus);
  const [items, setItems] = useState<ClinicalItem[]>(defaultItems);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const chosen = useMemo(() => new Set(items.map((i) => i.label.toLowerCase())), [items]);
  const trimmed = query.trim();

  // Catalogue entries matching the query, minus anything already chosen.
  const matches = useMemo(() => {
    const needle = trimmed.toLowerCase();
    return groups
      .map((g) => ({
        group: g.group,
        items: g.items.filter(
          (i) => !chosen.has(i.toLowerCase()) && (needle === "" || i.toLowerCase().includes(needle)),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, trimmed, chosen]);

  const flat = useMemo(() => matches.flatMap((g) => g.items), [matches]);

  // Offer the typed text when it is not already an exact catalogue hit — this
  // is the "Other — specify" path, without a separate mode to switch into.
  const exact = flat.some((i) => i.toLowerCase() === trimmed.toLowerCase());
  const canAddCustom = trimmed.length > 0 && !exact && !chosen.has(trimmed.toLowerCase());
  const options = canAddCustom ? [...flat, trimmed] : flat;

  function add(label: string) {
    const clean = label.trim();
    if (!clean || chosen.has(clean.toLowerCase())) return;
    setItems((prev) => [...prev, { ...BLANK_ITEM, label: clean }]);
    setStatus("RECORDED");
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
  }

  function remove(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setExpanded(null);
  }

  function patch(index: number, change: Partial<ClinicalItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...change } : it)));
  }

  function setNoList(next: Status) {
    setStatus(next);
    setItems([]);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      // Never let the dropdown's Enter submit the surrounding form.
      e.preventDefault();
      if (options[active]) add(options[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && query === "" && items.length > 0) {
      remove(items.length - 1);
    }
  }

  const listId = `${id}-list`;

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1.5 block text-sm font-medium">{legend}</legend>

      {/* What the server reads. */}
      <input type="hidden" name={statusName} value={status} />
      {items.map((item, i) => (
        <div key={`${id}-hidden-${i}`}>
          <input type="hidden" name={`${fieldName}.label`} value={item.label} />
          {withAllergyDetail ? (
            <>
              <input type="hidden" name={`${fieldName}.reaction`} value={item.reaction} />
              <input type="hidden" name={`${fieldName}.severity`} value={item.severity} />
            </>
          ) : null}
          <input type="hidden" name={`${fieldName}.notes`} value={item.notes} />
        </div>
      ))}

      <div className="flex flex-wrap gap-1.5">
        <StatusChip
          label={noneLabel}
          active={status === "NONE_KNOWN"}
          onClick={() => setNoList(status === "NONE_KNOWN" ? "UNKNOWN" : "NONE_KNOWN")}
        />
        <StatusChip
          label="Unknown — not asked"
          active={status === "UNKNOWN"}
          onClick={() => setNoList("UNKNOWN")}
        />
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className={CONTROL}
        />

        {open && options.length > 0 ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-card"
          >
            {matches.map((group) => (
              <li key={group.group}>
                <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-ink-faint uppercase">
                  {group.group}
                </p>
                <ul>
                  {group.items.map((item) => {
                    const index = options.indexOf(item);
                    return (
                      <li key={item}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={index === active}
                          onMouseDown={(e) => e.preventDefault()}
                          onMouseEnter={() => setActive(index)}
                          onClick={() => add(item)}
                          className={`block w-full px-3 py-1.5 text-left text-sm ${
                            index === active ? "bg-accent-soft text-accent-ink" : "hover:bg-surface-muted"
                          }`}
                        >
                          {item}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}

            {canAddCustom ? (
              <li className="border-t border-border">
                <button
                  type="button"
                  role="option"
                  aria-selected={active === options.length - 1}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(options.length - 1)}
                  onClick={() => add(trimmed)}
                  className={`block w-full px-3 py-2 text-left text-sm ${
                    active === options.length - 1
                      ? "bg-accent-soft text-accent-ink"
                      : "hover:bg-surface-muted"
                  }`}
                >
                  Add “{trimmed}” <span className="text-ink-faint">— not in the list</span>
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      {items.length > 0 ? (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={`${id}-tag-${i}`} className="rounded-lg border border-border bg-surface-muted">
              <div className="flex items-center gap-2 px-2.5 py-1.5">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>
                {withAllergyDetail ? (
                  <>
                    {item.severity ? (
                      <span className="text-xs text-ink-muted">
                        {ALLERGY_SEVERITY_LABELS[item.severity as keyof typeof ALLERGY_SEVERITY_LABELS]}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setExpanded(expanded === i ? null : i)}
                      className="rounded px-1.5 py-0.5 text-xs font-medium text-accent-ink hover:underline"
                    >
                      {expanded === i ? "Done" : "Detail"}
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={`Remove ${item.label}`}
                  className="rounded px-1.5 text-ink-faint transition-colors hover:text-danger-ink"
                >
                  ×
                </button>
              </div>

              {withAllergyDetail && expanded === i ? (
                <div className="grid gap-2 border-t border-border px-2.5 py-2 sm:grid-cols-3">
                  <label className="text-xs">
                    <span className="mb-1 block font-medium text-ink-muted">Reaction</span>
                    <input
                      value={item.reaction}
                      onChange={(e) => patch(i, { reaction: e.target.value })}
                      placeholder="Hives, swelling"
                      className={CONTROL}
                    />
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block font-medium text-ink-muted">Severity</span>
                    <select
                      value={item.severity}
                      onChange={(e) => patch(i, { severity: e.target.value })}
                      className={CONTROL}
                    >
                      <option value="">Not recorded</option>
                      {Object.entries(ALLERGY_SEVERITY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block font-medium text-ink-muted">Notes</span>
                    <input
                      value={item.notes}
                      onChange={(e) => patch(i, { notes: e.target.value })}
                      placeholder="First noted 2015"
                      className={CONTROL}
                    />
                  </label>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {error?.[0] ? (
        <p className="text-xs text-danger-ink">{error[0]}</p>
      ) : (
        <p className="text-xs text-ink-faint">
          {status === "NONE_KNOWN"
            ? `Recorded as ${noneLabel.toLowerCase()}.`
            : status === "UNKNOWN" && items.length === 0
              ? "Nothing recorded — this reads as “not asked”, not as “none”."
              : "Type to search, or add anything not listed."}
        </p>
      )}
    </fieldset>
  );
}

function StatusChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-accent bg-accent text-on-accent"
          : "border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
