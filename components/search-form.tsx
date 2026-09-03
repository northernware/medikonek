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
        className="w-full max-w-sm rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px] placeholder:text-ink-faint hover:border-border-strong focus:border-accent"
      />
      <button className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink">
        Search
      </button>
    </form>
  );
}
