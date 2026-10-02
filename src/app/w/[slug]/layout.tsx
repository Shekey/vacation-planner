import Link from "next/link";
import { requireMembership } from "@/lib/session";

export default async function WorkspaceLayout({ children, params }: LayoutProps<"/w/[slug]">) {
  const { slug } = await params;
  const { workspace, membership } = await requireMembership(slug);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">{workspace.name}</h1>
        <div className="flex gap-4 text-sm">
          <span className="opacity-70">{membership.role === "ADMIN" ? "Admin" : "Member"}</span>
          <Link href="/" className="underline">
            Switch workspace
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}
