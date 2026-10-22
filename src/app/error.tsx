"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n-provider";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useI18n().t.common.error;
  // Server errors come with Next's digest; browser errors get a short code of their own.
  const [reference] = useState(() => error.digest ?? crypto.randomUUID().slice(0, 8));
  // The page shows a clean message; the details go to Sentry, findable by the reference shown to the person.
  useEffect(() => {
    Sentry.captureException(error, { tags: { reference } });
  }, [error, reference]);
  return (
    <div className="mx-auto max-w-md space-y-3">
      <h1 className="text-xl font-semibold">{t.title}</h1>
      <p className="opacity-80">{t.body}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" onClick={() => retry()}>
          {t.retry}
        </button>
        <Link href="/" className="btn-secondary">
          {t.home}
        </Link>
      </div>
      <p className="text-sm text-muted">
        {t.reference} <code className="rounded bg-muted/20 px-1">{reference}</code>.{" "}
        <Link href="/impressum" className="underline">
          {t.contact}
        </Link>
      </p>
    </div>
  );
}
