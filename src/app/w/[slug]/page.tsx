import { db } from "@/lib/db";
import { requireMembership } from "@/lib/session";

export default async function WorkspacePage({ params }: PageProps<"/w/[slug]">) {
  const { slug } = await params;
  const { workspace } = await requireMembership(slug);
  const members = await db.membership.findMany({
    where: { workspaceId: workspace.id, removedAt: null },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  });
  const settings = workspace.settings;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="card space-y-2">
        <h2 className="font-medium">Members ({members.length})</h2>
        <ul className="text-sm">
          {members.map((m) => (
            <li key={m.id} className="flex justify-between py-1">
              <span>{m.user.name ?? m.user.email}</span>
              <span className="opacity-70">{m.role === "ADMIN" ? "Admin" : "Member"}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="card space-y-2 text-sm">
        <h2 className="font-medium">Settings</h2>
        <p>Timezone: {workspace.timezone}</p>
        <p>Approvals: {settings?.approvalsEnabled ? "on" : "off"}</p>
        <p>Half days: {settings?.allowHalfDays ? "allowed" : "not allowed"}</p>
        <p>Weekends count as vacation days: {settings?.countWeekends ? "yes" : "no"}</p>
      </section>
      <p className="text-sm opacity-70 md:col-span-2">
        The team calendar, bookings and invitations arrive in the next milestones.
      </p>
    </div>
  );
}
