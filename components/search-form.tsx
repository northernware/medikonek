/** A plain GET form — search survives with JavaScript off and is linkable. */
export function SearchForm({
  action,
  placeholder,
  defaultValue,
}: {
  action: string;
  placeholder: string;
  defaultValue?: string;
}) {
  return (
    <form action={action} role="search" className="flex gap-2">
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-ink-faint hover:border-border-strong focus:border-accent"
      />
      <button className="rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink">
        Search
      </button>
    </form>
  );
}
