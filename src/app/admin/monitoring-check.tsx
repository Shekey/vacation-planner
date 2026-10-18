"use client";

import { useState } from "react";
import { ActionForm } from "@/components/action-form";
import { useI18n } from "@/components/i18n-provider";
import { sendSentryTestAction } from "./actions";

/** Throws while rendering, which the nearest error page catches and reports to Sentry like any real crash. */
function Crash(): never {
  throw new Error("Sentry test from /admin (browser)");
}

export function MonitoringCheck() {
  const t = useI18n().t.superadmin.monitoring;
  const [crash, setCrash] = useState(false);
  if (crash) return <Crash />;
  return (
    <section className="card space-y-2">
      <h2 className="font-medium">{t.heading}</h2>
      <p className="max-w-2xl text-sm text-muted">{t.body}</p>
      <div className="flex flex-wrap items-start gap-3">
        <ActionForm action={sendSentryTestAction}>
          <button className="btn-secondary">{t.send}</button>
        </ActionForm>
        <button className="btn-secondary" onClick={() => setCrash(true)}>
          {t.crash}
        </button>
      </div>
    </section>
  );
}
