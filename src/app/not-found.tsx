import Link from "next/link";
import { getMessages } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = (await getMessages()).common.notFound;
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">{t.title}</h1>
      <p className="opacity-80">{t.body}</p>
      <Link href="/" className="underline">
        {t.back}
      </Link>
    </div>
  );
}
