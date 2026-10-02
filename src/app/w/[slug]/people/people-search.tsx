"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui";

export type PersonRow = {
  id: string;
  name: string;
  email: string;
  /** e.g. "Off today (vacation) until 16 Oct" or null when in. */
  todayStatus: string | null;
  upcoming: { id: string; label: string; detail: string; pending: boolean; color: string }[];
};

/** Lowercase, accent-free text so "sefik" finds "Šefik". */
function fold(text: string) {
  return text.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
}

export function PeopleSearch({ people }: { people: PersonRow[] }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = fold(query.trim());
    return q ? people.filter((p) => fold(`${p.name} ${p.email}`).includes(q)) : people;
  }, [people, query]);

  return (
    <div className="space-y-4">
      <input
        type="search"
        className="input text-base"
        placeholder="Search by name or email"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
        aria-label="Search people"
      />
      {shown.length === 0 ? (
        <p className="opacity-70">Nobody matches &ldquo;{query}&rdquo;.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {shown.map((p) => (
            <li key={p.id} className="card space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar label={p.name} seed={p.email} className="size-9 text-sm" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.name}</div>
                    {p.name !== p.email && <div className="truncate text-xs opacity-60">{p.email}</div>}
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-sm ${
                    p.todayStatus
                      ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                      : "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200"
                  }`}
                >
                  {p.todayStatus ?? "In today"}
                </span>
              </div>
              {p.upcoming.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {p.upcoming.map((u) => (
                    <li key={u.id} className="flex items-center gap-2">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${u.color}`} />
                      <span className="font-medium">{u.label}</span>
                      <span className="opacity-70">
                        {u.detail}
                        {u.pending && " · pending"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm opacity-60">No time off planned.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
