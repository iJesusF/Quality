import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { getWorkspaceContext } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function QualityLayout({ children }: { children: ReactNode }) {
  const context = await getWorkspaceContext();
  return <AppShell user={{ email: context.user.email ?? "", name: context.user.user_metadata.full_name || context.user.email?.split("@")[0] || "Usuario" }} project={context.project}>{children}</AppShell>;
}
