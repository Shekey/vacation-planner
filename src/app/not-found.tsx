import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="opacity-80">This page doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <Link href="/" className="underline">
        Back to your workspaces
      </Link>
    </div>
  );
}
