import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { getMessages } from "@/lib/i18n/server";
import { safeRedirectPath } from "@/lib/security";
import { requireOperatorEmail } from "@/lib/superadmin-session";
import { otpauthUri } from "@/lib/totp";
import { sessionTwoFactorVerified, twoFactorStateOf } from "@/lib/two-factor";
import { RenewCodes, SetupForm, VerifyForm } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).twoFactor.title, robots: { index: false, follow: false } };
}

/** Set up or pass the second factor. Only for the operator's team: everyone else gets a 404. */
export default async function TwoFactorPage({ searchParams }: PageProps<"/two-factor">) {
  const user = await requireOperatorEmail();
  const { next } = await searchParams;
  const nextPath = safeRedirectPath(next, "/admin");
  const t = (await getMessages()).twoFactor;
  const state = await twoFactorStateOf(user.id);
  const verified = await sessionTwoFactorVerified();

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
      {state.kind === "setup" ? (
        <SetupForm qr={await QRCode.toDataURL(otpauthUri(state.secret, user.email), { margin: 1, width: 200 })} secret={state.secret} />
      ) : !verified ? (
        <VerifyForm next={nextPath} recoveryLeft={state.recoveryLeft} />
      ) : (
        <div className="space-y-4">
          <div className="card space-y-2">
            <h2 className="font-medium">{t.verifiedTitle}</h2>
            <p className="text-sm text-muted">{t.verifiedBody}</p>
            <Link href={nextPath} className="btn inline-flex">
              {t.toAdmin}
            </Link>
          </div>
          <RenewCodes />
        </div>
      )}
    </div>
  );
}
