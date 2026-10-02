"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md space-y-3">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="opacity-80">That didn&apos;t work. Try again, and if it keeps happening, reload the page.</p>
      <button className="btn" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
