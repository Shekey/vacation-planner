"use server";

import { redirect } from "next/navigation";
import { getMessages } from "@/lib/i18n/server";
import { safeRedirectPath } from "@/lib/security";
import { requireOperatorEmail, requireSuperAdmin } from "@/lib/superadmin-session";
import { confirmSetup, renewRecoveryCodes, verifySignIn, type VerifyResult } from "@/lib/two-factor";

export type TwoFactorFormState = { error?: string; codes?: string[] };

async function messageFor(result: Extract<VerifyResult, { ok: false }>) {
  return (await getMessages()).twoFactor.errors[result.reason];
}

/** Scanned and typed the first code: two-factor is on, and the recovery codes are shown once. */
export async function confirmSetupAction(_prev: TwoFactorFormState, formData: FormData): Promise<TwoFactorFormState> {
  const user = await requireOperatorEmail();
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: (await getMessages()).twoFactor.errors.empty };
  const result = await confirmSetup(user.id, code);
  if (!result.ok) return { error: await messageFor(result) };
  return { codes: result.recoveryCodes };
}

/** An authenticator code or a recovery code; on success on to where the operator was going. */
export async function verifyAction(next: string, _prev: TwoFactorFormState, formData: FormData): Promise<TwoFactorFormState> {
  const user = await requireOperatorEmail();
  const input = String(formData.get("code") ?? "").trim();
  if (!input) return { error: (await getMessages()).twoFactor.errors.empty };
  const result = await verifySignIn(user.id, input);
  if (!result.ok) return { error: await messageFor(result) };
  redirect(safeRedirectPath(next, "/admin"));
}

export async function renewCodesAction(): Promise<TwoFactorFormState> {
  const user = await requireSuperAdmin();
  return { codes: await renewRecoveryCodes(user.id) };
}
