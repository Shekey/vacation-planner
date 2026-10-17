"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { confirmSetupAction, renewCodesAction, verifyAction, type TwoFactorFormState } from "./actions";

const empty: TwoFactorFormState = {};

function CodeInput({ label }: { label: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <input name="code" className="input block max-w-xs text-lg tracking-widest" autoComplete="one-time-code" inputMode="text" autoFocus required />
    </label>
  );
}

function Errors({ error }: { error?: string }) {
  return (
    <div aria-live="polite" role="status">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

/** The recovery codes, shown once, with a way on. */
export function RecoveryCodes({ codes, done }: { codes: string[]; done?: string }) {
  const t = useI18n().t.twoFactor;
  return (
    <div className="space-y-3">
      <h2 className="font-medium">{t.recoveryTitle}</h2>
      <p className="text-sm text-muted">{t.recoveryBody}</p>
      <ul className="grid max-w-xs grid-cols-2 gap-2 rounded-lg bg-black/5 p-3 font-mono text-sm dark:bg-white/10">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      {done && (
        <Link href={done} className="btn inline-flex">
          {t.recoveryDone}
        </Link>
      )}
    </div>
  );
}

export function SetupForm({ qr, secret }: { qr: string; secret: string }) {
  const t = useI18n().t.twoFactor;
  const [state, action, pending] = useActionState(confirmSetupAction, empty);
  if (state.codes) return <RecoveryCodes codes={state.codes} done="/admin" />;
  return (
    <div className="space-y-4">
      <p className="text-sm">{t.setupIntro}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt={t.scanAlt} width={200} height={200} className="rounded-lg border border-border bg-white" />
      <p className="text-sm text-muted">
        {t.orType} <code className="font-mono text-foreground">{secret.match(/.{1,4}/g)?.join(" ")}</code>
      </p>
      <form action={action} className="space-y-3">
        <CodeInput label={t.codeLabel} />
        <button className="btn" disabled={pending}>
          {t.turnOn}
        </button>
        <Errors error={state.error} />
      </form>
    </div>
  );
}

export function VerifyForm({ next, recoveryLeft }: { next: string; recoveryLeft: number }) {
  const t = useI18n().t.twoFactor;
  const [state, action, pending] = useActionState(verifyAction.bind(null, next), empty);
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm">{t.verifyIntro}</p>
      <CodeInput label={t.verifyLabel} />
      <button className="btn" disabled={pending}>
        {t.verify}
      </button>
      <p className="text-xs text-muted">{t.recoveryLeft(recoveryLeft)}</p>
      <Errors error={state.error} />
    </form>
  );
}

export function RenewCodes() {
  const t = useI18n().t.twoFactor;
  const [state, action, pending] = useActionState(renewCodesAction, empty);
  if (state.codes) return <RecoveryCodes codes={state.codes} />;
  return (
    <form action={action} className="space-y-1">
      <button className="btn-secondary" disabled={pending}>
        {t.newCodes}
      </button>
      <p className="text-xs text-muted">{t.newCodesHint}</p>
    </form>
  );
}
