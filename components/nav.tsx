"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Today", icon: "M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/calendar", label: "Calendar", icon: "M8 3v4M16 3v4M4 9h16M5 5h14v16H5z" },
  { href: "/appointments", label: "Appointments", icon: "M4 7h16M4 12h16M4 17h10" },
  { href: "/households", label: "Households", icon: "M4 20v-2a4 4 0 014-4h1m7 6v-2a4 4 0 00-3-3.9M9 7a3 3 0 106 0 3 3 0 10-6 0m8 3a2.5 2.5 0 100-5" },
  { href: "/patients", label: "Patients", icon: "M12 11a4 4 0 100-8 4 4 0 000 8zM5 21v-1a7 7 0 0114 0v1" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav({ orientation }: { orientation: "sidebar" | "bar" }) {
  const pathname = usePathname();
  const sidebar = orientation === "sidebar";

  return (
    <nav
      aria-label="Main"
      className={sidebar ? "flex flex-col gap-0.5" : "flex gap-1 overflow-x-auto px-4 pb-2"}
    >
      {LINKS.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={[
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              active ? "bg-accent-soft text-accent-ink" : "text-ink-muted hover:bg-surface-muted hover:text-ink",
            ].join(" ")}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-4 shrink-0"
            >
              <path d={link.icon} />
            </svg>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
