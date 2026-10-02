import { ActionForm } from "@/components/action-form";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { saveNameAction } from "./actions";

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const { id } = await requireUser();
  const { next } = await searchParams;
  const user = await db.user.findUniqueOrThrow({ where: { id }, select: { name: true, email: true } });

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
    </div>
  );
}
