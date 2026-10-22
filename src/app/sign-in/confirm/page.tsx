import Link from "next/link";
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
    <div className="card mx-auto mt-6 max-w-sm space-y-4 p-6 sm:mt-12 sm:p-8">
      <h1 className="text-xl font-semibold">{t.confirm.title}</h1>
      {fields ? (
        <form method="get" action={EMAIL_CALLBACK_PATH} className="space-y-4">
          <p>
            {t.confirm.body} <b className="break-words">{fields.email}</b>
          </p>
          <input type="hidden" name="token" value={fields.token} />
          <input type="hidden" name="email" value={fields.email} />
          {fields.callbackUrl && <input type="hidden" name="callbackUrl" value={fields.callbackUrl} />}
          <button className="btn w-full">{t.confirm.button}</button>
          <p className="text-sm text-muted">{t.confirm.why}</p>
        </form>
      ) : (
        <>
          <p role="alert">{t.confirm.broken}</p>
          <Link href="/sign-in" className="btn inline-block">
            {t.confirm.newLink}
          </Link>
        </>
      )}
    </div>
  );
}
