import { ActionForm } from "@/components/action-form";
import { accountDeletionPlan } from "@/lib/account";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { deleteAccountAction, saveNameAction } from "./actions";

export const metadata = { title: "Your profile" };

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const { id } = await requireUser();
  const { next } = await searchParams;
  const [user, plan] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id },
      select: { name: true, email: true },
    }),
    accountDeletionPlan(id),
  ]);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-semibold">{user.name ? "Your profile" : "What should your team call you?"}</h1>
      <ActionForm action={saveNameAction} className="space-y-3">
        <input type="hidden" name="next" value={typeof next === "string" ? next : ""} />
        <label className="block space-y-1">
          <span className="text-sm font-medium">Name</span>
          <input
            name="name"
            className="input"
            required
            minLength={2}
            maxLength={60}
            defaultValue={user.name ?? ""}
            placeholder="Your name"
            autoFocus
          />
        </label>
        <p className="text-sm opacity-70">Shown on the calendar instead of your email ({user.email}).</p>
        <button className="btn">Save</button>
      </ActionForm>

      {user.name && (
        <>
          <section className="card space-y-2">
            <h2 className="font-medium">Your data</h2>
            <p className="text-sm opacity-70">
              Download everything stored about you: profile, workspaces, allowances and bookings, as a JSON file.
            </p>
            <a href="/api/account/export" className="btn-secondary inline-block" download>
              Download my data
            </a>
          </section>

          <section className="card space-y-3 border-red-500/40">
            <h2 className="font-medium text-red-600">Delete my account</h2>
            <p className="text-sm opacity-70">
              Removes your profile, your bookings and your place in every workspace. This can&apos;t be undone.
              {plan.alone.length > 0 &&
                ` You're the only member of ${plan.alone.map((w) => w.name).join(", ")}, so ${plan.alone.length === 1 ? "it is" : "they are"} deleted too.`}
            </p>
            {plan.blocked.length > 0 ? (
              <p className="text-sm">
                First make someone else an admin of{" "}
                {plan.blocked.map((w, i) => (
                  <span key={w.slug}>
                    {i > 0 && ", "}
                    <a className="text-primary hover:underline" href={`/w/${w.slug}/members`}>
                      {w.name}
                    </a>
                  </span>
                ))}
                , or delete {plan.blocked.length === 1 ? "that workspace" : "those workspaces"} in Settings.
              </p>
            ) : (
              <ActionForm action={deleteAccountAction} className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Type {user.email} to confirm</span>
                  <input name="confirmEmail" type="email" className="input" required autoComplete="off" />
                </label>
                <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                  Delete my account
                </button>
              </ActionForm>
            )}
          </section>
        </>
      )}
    </div>
  );
}
