"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useI18n } from "@/components/i18n-provider";
import type { DirectoryGroup } from "@/lib/directory";
import { connectDirectoryAction, directoryGroupsAction, disconnectDirectoryAction, loadDirectoryAction } from "./actions";

export type DirectoryStatus = {
  /** The server has a Microsoft app registration to connect with. */
  available: boolean;
  /** When an admin connected it, already formatted; null when not connected. */
  connectedOn: string | null;
  group: { id: string; name: string | null } | null;
  /** What came back from Microsoft's consent page, shown once. */
  outcome: string | null;
};

const OUTCOMES = ["declined", "expired", "notMember", "consentMissing", "failed"] as const;

/** Microsoft 365 as a source of people (#57): connect once, pick everyone or a group, load them into the importer. */
export function DirectoryPanel({ slug, status, onLoaded }: { slug: string; status: DirectoryStatus; onLoaded: (text: string) => void }) {
  const { t: messages } = useI18n();
  const t = messages.directory;
  const [groups, setGroups] = useState<DirectoryGroup[] | null>(status.group ? [{ id: status.group.id, name: status.group.name ?? status.group.id }] : null);
  const [groupId, setGroupId] = useState(status.group?.id ?? "");
  const [error, setError] = useState<string | null>(
    OUTCOMES.find((o) => o === status.outcome) ? t.errors[status.outcome as (typeof OUTCOMES)[number]] : null,
  );
  const [note, setNote] = useState<string | null>(null);
  const [reconnect, setReconnect] = useState(status.outcome === "consentMissing");
  const [leavers, setLeavers] = useState<{ name: string | null; email: string }[]>([]);
  const [pending, start] = useTransition();

  if (!status.available) return <p className="text-sm text-muted">{t.unavailable}</p>;

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      setError(null);
      setNote(null);
      setReconnect(false);
      await fn();
    });

  const connectButton = (
    <button
      type="button"
      className="btn"
      disabled={pending}
      onClick={() =>
        run(async () => {
          const result = await connectDirectoryAction(slug);
          if (result?.error) setError(result.error);
        })
      }
    >
      {t.connect}
    </button>
  );

  if (!status.connectedOn) {
    return (
      <section className="card space-y-3" aria-labelledby="directory-heading">
        <h3 id="directory-heading" className="font-medium">
          {t.heading}
        </h3>
        <p className="text-sm">{t.intro}</p>
        <p className="text-sm text-muted">{t.connectHint}</p>
        {connectButton}
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      </section>
    );
  }

  return (
    <section className="card space-y-3" aria-labelledby="directory-heading">
      <h3 id="directory-heading" className="font-medium">
        {t.heading}
      </h3>
      <p className="text-sm text-muted">
        {t.connectedAt(status.connectedOn)} {t.nightly}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 basis-64 space-y-1">
          <span className="text-sm font-medium">{t.who}</span>
          <select className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">{t.everyone}</option>
            {groups?.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        {(!groups || groups.length <= 1) && (
          <button
            type="button"
            className="btn-secondary"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const result = await directoryGroupsAction(slug);
                if (result.error) {
                  setError(result.error);
                  setReconnect(!!result.reconnect);
                } else setGroups(result.groups ?? []);
              })
            }
          >
            {pending && !groups ? t.loadingGroups : t.loadGroups}
          </button>
        )}
        <button
          type="button"
          className="btn"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const name = groups?.find((g) => g.id === groupId)?.name ?? null;
              const result = await loadDirectoryAction(slug, groupId || null, name);
              if (result.error) {
                setError(result.error);
                setReconnect(!!result.reconnect);
                return;
              }
              setLeavers(result.leavers ?? []);
              setNote(t.loaded(result.count ?? 0));
              onLoaded(result.text ?? "");
            })
          }
        >
          {pending ? t.loading : t.load}
        </button>
      </div>
      <div aria-live="polite" className="space-y-2">
        {error && <p className="text-sm text-danger">{error}</p>}
        {note && <p className="text-sm">{note}</p>}
      </div>
      {reconnect && connectButton}
      {leavers.length > 0 && (
        <div className="space-y-1 rounded-xl bg-amber-50 p-3 text-sm dark:bg-amber-900/20">
          <p className="font-medium">{t.leaversHeading}</p>
          <p className="text-muted">{t.leaversHint}</p>
          <ul className="list-disc pl-5">
            {leavers.map((p) => (
              <li key={p.email}>{p.name ? `${p.name} (${p.email})` : p.email}</li>
            ))}
          </ul>
          <Link href={`/w/${slug}/members`} className="text-primary hover:underline">
            {t.toMembers}
          </Link>
        </div>
      )}
      <button
        type="button"
        className="text-sm text-muted hover:text-foreground hover:underline"
        disabled={pending}
        onClick={() => {
          if (!confirm(t.disconnectConfirm)) return;
          run(async () => {
            const result = await disconnectDirectoryAction(slug);
            setNote(result.ok ?? null);
          });
        }}
      >
        {t.disconnect}
      </button>
    </section>
  );
}
