import { classNames, formatDateTimeKST } from "../utils";
import type { SectorNewsRow, NewsDetailItem } from "../types";

/** ===== Sector UI ===== */
export function SectorLeftItem({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "relative w-full text-left rounded-lg px-3 py-2 transition",
        active ? "bg-white shadow-sm ring-1 ring-black/5" : "hover:bg-white/60"
      )}
    >
      <span
        className={classNames(
          "absolute left-2 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full",
          active ? "bg-neutral-900" : "bg-transparent"
        )}
      />
      <div
        className={classNames(
          "pl-3 text-[13px] leading-4",
          active ? "font-extrabold text-neutral-900" : "font-semibold text-neutral-700"
        )}
      >
        {label}
      </div>
    </button>
  );
}

export function SectorScrollButton({
  dir,
  disabled,
  onClick,
}: {
  dir: "up" | "down";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={dir === "up" ? "위로 스크롤" : "아래로 스크롤"}
      disabled={disabled}
      onClick={onClick}
      className={classNames(
        "h-7 w-7 rounded-full ring-1 shadow-sm transition flex items-center justify-center",
        "backdrop-blur bg-white/80 hover:bg-white",
        disabled ? "opacity-25 cursor-not-allowed ring-black/5" : "opacity-100 ring-black/10 hover:ring-black/20"
      )}
    >
      <span className="text-[14px] leading-none text-neutral-800">{dir === "up" ? "˄" : "˅"}</span>
    </button>
  );
}

function pickMarketTag(row: SectorNewsRow): { text: string; cls: string } {
  const mk = (row.market || "").toUpperCase();
  if (mk === "KR") return { text: "국내", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
  if (mk === "INTERNATIONAL") return { text: "해외", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200" };
  return { text: "구분", cls: "bg-neutral-100 text-neutral-700 ring-black/5" };
}

export function SectorNewsRowItem({
  row,
  onOpen,
}: {
  row: SectorNewsRow;
  onOpen: (detail: NewsDetailItem) => void;
}) {
  const tag = pickMarketTag(row);
  const dt = formatDateTimeKST(row.published_at);

  return (
    <button
      type="button"
      onClick={() =>
        onOpen({
          id: row.id,
          title: row.title,
          summary: "",
          imageUrl: undefined,
          date: dt,
          originUrl: row.url,
          tags: [tag.text, row.ticker ? `티커: ${row.ticker}` : "", row.related_name ? `관련: ${row.related_name}` : ""].filter(Boolean),
          marketTag: tag,
          related: { name: row.related_name, code: row.ticker },
        })
      }
      className="group block w-full text-left"
      title={row.title}
    >
      <div className="flex items-center gap-3 border-b border-neutral-200/70 py-2.5 px-0.5">
        <div className="shrink-0">
          <span className={classNames("inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold ring-1 ml-0.5", tag.cls)}>
            {tag.text}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-neutral-900 group-hover:text-neutral-950">{row.title}</div>
        </div>

        <div className="shrink-0 text-[12px] text-neutral-400 tabular-nums">{dt}</div>
      </div>
    </button>
  );
}
