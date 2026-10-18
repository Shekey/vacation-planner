"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { useI18n } from "@/components/i18n-provider";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useI18n().t.common.error;
  // The page already shows a clean message; the details go to Sentry.
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-md space-y-3">
      <h1 className="text-xl font-semibold">{t.title}</h1>
      <p className="opacity-80">{t.body}</p>
      <button className="btn" onClick={reset}>
        {t.retry}
      </button>
    </div>
  );
}
