"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n-provider";

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const t = useI18n().t.workspace.components;
  return (
    <div className="flex gap-2">
      <input readOnly value={value} className="input font-mono text-xs" onFocus={(e) => e.target.select()} />
      <button
        type="button"
        className="btn-secondary px-3 py-0 text-sm"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? t.copied : t.copy}
      </button>
    </div>
  );
}
