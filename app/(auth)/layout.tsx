import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentDoctor } from "@/lib/auth";
import { Brand } from "@/components/brand";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  if (await getCurrentDoctor()) redirect("/");

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="px-6 py-6">
        <Brand href="/login" />
      </div>
      <div className="flex flex-1 items-start justify-center px-4 pb-16 sm:items-center sm:pb-24">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
