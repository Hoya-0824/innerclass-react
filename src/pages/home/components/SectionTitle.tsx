import type { ReactNode } from "react";

export function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-lg font-semibold text-neutral-900">{title}</div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
