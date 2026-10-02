export default function Loading() {
  return (
    <div className="grid animate-pulse gap-4 md:grid-cols-2" aria-busy="true" aria-label="Loading">
      <div className="card h-28 bg-black/5 dark:bg-white/5" />
      <div className="card h-28 bg-black/5 dark:bg-white/5" />
      <div className="card h-40 bg-black/5 md:col-span-2 dark:bg-white/5" />
    </div>
  );
}
