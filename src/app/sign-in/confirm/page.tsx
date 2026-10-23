import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { getMessages } from "@/lib/i18n/server";
import { callbackFields, EMAIL_CALLBACK_PATH } from "@/lib/sign-in-link";

export async function generateMetadata() {
  return { title: (await getMessages()).signIn.title };
}

/**
 * The sign-in email links here, not to Auth.js. Only the button below uses the one-time link, so a mail filter that
 * opens the email's links first leaves it working.
 */
export default async function ConfirmSignInPage({ searchParams }: PageProps<"/sign-in/confirm">) {
  const t = (await getMessages()).signIn;
  const fields = callbackFields(await searchParams);

  return (
    <AuthShell>
      <div className="space-y-3 pt-4">
        <h1 className="text-[30px] leading-[1.15] font-normal">{t.confirm.title}</h1>
        {fields ? (
          <form method="get" action={EMAIL_CALLBACK_PATH} className="space-y-5">
            <p className="text-[15px] text-muted">
              {t.confirm.body} <b className="font-semibold break-words text-foreground">{fields.email}</b>
            </p>
            <input type="hidden" name="token" value={fields.token} />
            <input type="hidden" name="email" value={fields.email} />
            {fields.callbackUrl && <input type="hidden" name="callbackUrl" value={fields.callbackUrl} />}
            <button className="btn min-h-[50px] w-full gap-[9px] rounded-[12px] px-[18px] py-3 text-[15px]">
              <ArrowRight aria-hidden className="size-[18px]" />
              {t.confirm.button}
            </button>
            <p className="text-xs text-muted">{t.confirm.why}</p>
          </form>
        ) : (
          <>
            <p role="alert" className="rounded-[12px] bg-danger-soft p-3 text-sm text-danger">
              {t.confirm.broken}
            </p>
            <Link href="/sign-in" className="btn min-h-[50px] rounded-[12px] px-[18px] text-[15px]">
              {t.confirm.newLink}
            </Link>
          </>
        )}
      </div>
    </AuthShell>
  );
}
