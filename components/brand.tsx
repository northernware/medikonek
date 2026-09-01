import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-lg bg-accent text-on-accent"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4.5">
          <path d="M12 7v10M7 12h10" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight">
        MEDI<span className="text-accent-ink">KONEK</span>
      </span>
    </Link>
  );
}
