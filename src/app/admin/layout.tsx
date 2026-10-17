import { requireSuperAdmin } from "@/lib/superadmin-session";

/** Everything under /admin is for the operator's team only; the guard runs here and again in each page and action. */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireSuperAdmin();
  return children;
}
