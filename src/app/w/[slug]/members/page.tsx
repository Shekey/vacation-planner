import { ActionForm } from "@/components/action-form";
import { Avatar } from "@/components/ui";
import { db } from "@/lib/db";
import { HOLIDAY_REGIONS } from "@/lib/holiday-regions";
import { requireAdmin } from "@/lib/session";
import {
  inviteAction,
  removeMemberAction,
  resendInviteAction,
  revokeInviteAction,
  updateMemberAction,
} from "./actions";

export const metadata = { title: "Members" };

export default async function MembersPage({ params }: PageProps<"/w/[slug]/members">) {
  const { slug } = await params;
  const { workspace, membership: me } = await requireAdmin(slug);

  const [members, invites] = await Promise.all([
    db.membership.findMany({
      where: { workspaceId: workspace.id, removedAt: null },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { joinedAt: "asc" },
    }),
    db.invitation.findMany({
      where: { workspaceId: workspace.id, acceptedAt: null, revokedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const now = new Date();
  const regions = HOLIDAY_REGIONS[workspace.settings?.holidayCountry ?? ""] ?? [];
  const defaultRegion = regions.find((r) => r.code === workspace.settings?.holidayRegion)?.name;

  return (
    <div className="space-y-8">
      <section className="card space-y-3">
        <h2 className="font-medium">Invite people</h2>
        <ActionForm action={inviteAction.bind(null, slug)} className="space-y-3" resetOnSuccess>
          <textarea
            name="emails"
            aria-label="Email addresses to invite"
            className="input"
            rows={2}
            required
            placeholder="anna@company.com, ben@company.com"
          />
          <div className="flex flex-wrap items-center gap-3">
            <select name="role" className="input w-auto" defaultValue="MEMBER" aria-label="Invite as">
              <option value="MEMBER">as members</option>
              <option value="ADMIN">as admins</option>
            </select>
            <button className="btn">Send invites</button>
          </div>
        </ActionForm>
        <p className="text-xs opacity-60">Each person gets an email link that works for 7 days. Separate emails with commas or new lines.</p>
      </section>

      {invites.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Pending invitations</h2>
          <ul className="divide-y divide-black/5 dark:divide-white/10">
            {invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>
                  {i.email} <span className="opacity-60">· {i.role === "ADMIN" ? "admin" : "member"}</span>
                  {i.expiresAt < now && <span className="ml-2 text-red-600">expired</span>}
                </span>
                <span className="flex gap-3">
                  <ActionForm action={resendInviteAction.bind(null, slug, i.id)}>
                    <button className="text-primary hover:underline">Resend</button>
                  </ActionForm>
                  <ActionForm action={revokeInviteAction.bind(null, slug, i.id)}>
                    <button className="text-red-600 hover:underline">Revoke</button>
                  </ActionForm>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card space-y-2">
        <h2 className="font-medium">Members ({members.length})</h2>
        <ul className="divide-y divide-border">
          {members.map((m) => {
            const who = m.user.name ?? m.user.email;
            return (
            <li key={m.id} id={`member-${m.id}`} className="flex scroll-mt-20 flex-wrap items-center justify-between gap-3 rounded-lg py-3 target:-mx-2 target:px-2 target:bg-primary/10">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar label={who} seed={m.user.email} className="size-9 text-sm" />
                <div className="min-w-0">
                  <div className="font-medium">
                    {who}
                    {m.id === me.id && <span className="font-normal opacity-60"> (you)</span>}
                  </div>
                  {m.user.name && <div className="truncate text-sm opacity-60">{m.user.email}</div>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <ActionForm action={updateMemberAction.bind(null, slug, m.id)} className="flex flex-wrap items-center gap-2 text-sm">
                  <select name="role" defaultValue={m.role} className="input w-auto py-1" aria-label={`Role for ${who}`}>
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <label className="flex items-center gap-1">
                    <input
                      name="allowance"
                      type="number"
                      min={0}
                      max={365}
                      step={0.5}
                      defaultValue={m.annualAllowanceDays === null ? "" : Number(m.annualAllowanceDays)}
                      placeholder="–"
                      className="input w-20 py-1"
                      aria-label={`Yearly allowance for ${who}, in days`}
                    />
                    <span className="opacity-60">days/yr</span>
                  </label>
                  {regions.length > 0 && (
                    <select
                      name="region"
                      defaultValue={m.holidayRegion ?? ""}
                      className="input w-auto max-w-48 py-1"
                      aria-label={`Where ${who} works, for public holidays`}
                    >
                      <option value="">{defaultRegion ? `Team default (${defaultRegion})` : "Nationwide holidays only"}</option>
                      {regions.map((r) => (
                        <option key={r.code} value={r.code}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <button className="btn-secondary px-3 py-1" aria-label={`Save changes for ${who}`}>
                    Save
                  </button>
                </ActionForm>
                {m.id !== me.id && (
                  <ActionForm
                    action={removeMemberAction.bind(null, slug, m.id)}
                    confirm={`Remove ${who}? Their future bookings will be cancelled.`}
                  >
                    <button className="rounded-lg px-2 py-1 text-sm text-red-600 hover:bg-red-500/10" aria-label={`Remove ${who}`}>
                      Remove
                    </button>
                  </ActionForm>
                )}
              </div>
            </li>
            );
          })}
        </ul>
        <p className="text-xs opacity-60">Change anyone&apos;s yearly allowance here, including people who joined before the default was set. Leave it empty to not track it for that person.</p>
      </section>
    </div>
  );
}
