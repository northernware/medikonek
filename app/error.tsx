"use client";

import { buttonClass } from "@/components/ui";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-pretty text-ink-muted">
          Nothing was saved. Try again, and if it keeps happening check the server logs.
        </p>
        <button onClick={reset} className={buttonClass("primary", "mt-6")}>
          Try again
        </button>
      </div>
    </div>
  );
}
