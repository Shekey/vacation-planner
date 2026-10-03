import { getMessages } from "@/lib/i18n/server";

export default async function Loading() {
  const t = (await getMessages()).workspace;
  return (
    <div className="grid animate-pulse gap-4 md:grid-cols-2" aria-busy="true" aria-label={t.loading}>
      <div className="card h-28 bg-black/5 dark:bg-white/5" />
      <div className="card h-28 bg-black/5 dark:bg-white/5" />
      <div className="card h-40 bg-black/5 md:col-span-2 dark:bg-white/5" />
    </div>
  );
}
