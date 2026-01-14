// src/pages/home/components/TrendNewsCarousel.tsx
import { getHost } from "../utils";
import type { TrendNewsItem } from "../types";

import type { NewsItem as ModalNewsItem } from "../../../data/newsMockData";

function formatKSTForModal(dateLike?: string) {
  if (!dateLike) return "날짜 미상";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return String(dateLike);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function toModalItemFromTrend(n: TrendNewsItem): ModalNewsItem {
  const host = getHost(n.link);

  return {
    id: n.id, // ✅ TrendKeywordNews.id 그대로 전달 (NewsDetailModal 내부에서 summary API 호출 구조면, 서버에서 trend용 summary도 지원해야 함)
    title: n.title,
    summary: n.summary,
    date: formatKSTForModal(n.published_at),
    tags: [
      host || "news",
      n.related_stock_name ? `관련: ${n.related_stock_name}` : "",
      n.related_stock_code ? `코드: ${n.related_stock_code}` : "",
    ].filter(Boolean),
    imageUrl:
      n.image_url ||
      "https://images.unsplash.com/photo-1611974765270-ca1258822981?w=800&auto=format&fit=crop",
    originUrl: n.link,
  } as ModalNewsItem;
}

export function TrendNewsCard({
  item,
  onOpenModal,
}: {
  item: TrendNewsItem;
  onOpenModal: (modalItem: ModalNewsItem) => void;
}) {
  const host = getHost(item.link);
  const hasImg = Boolean(item.image_url);

  return (
    <button
      type="button"
      onClick={() => onOpenModal(toModalItemFromTrend(item))}
      className="group w-full overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md"
      title={item.title}
      aria-label={`트렌드 뉴스 상세 보기: ${item.title}`}
    >
      <div className="relative aspect-[16/9] bg-neutral-100">
        {hasImg ? (
          <img
            src={item.image_url as string}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-black/0 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <div className="p-3">
        <div className="line-clamp-2 text-sm font-semibold text-neutral-900">
          {item.title}
        </div>
        <div className="mt-2 line-clamp-2 text-xs text-neutral-600">
          {item.summary}
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
          {host ? <span className="truncate">{host}</span> : null}
          {host && item.published_at ? (
            <span className="text-neutral-300">•</span>
          ) : null}
          {item.published_at ? (
            <span className="shrink-0">{item.published_at}</span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

/** ===== Cute arrow buttons (no external icons) ===== */
export function CarouselArrowButton({
  dir,
  disabled,
  onClick,
}: {
  dir: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const base =
    "absolute top-1/2 -translate-y-1/2 z-10 rounded-full p-2 sm:p-2.5 ring-1 transition " +
    "backdrop-blur bg-white/70 hover:bg-white shadow-sm";
  const pos = dir === "left" ? "left-2" : "right-2";
  const state = disabled
    ? "opacity-30 cursor-not-allowed ring-black/5"
    : "opacity-100 cursor-pointer ring-black/10 hover:ring-black/20";

  return (
    <button
      type="button"
      aria-label={dir === "left" ? "이전" : "다음"}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${pos} ${state}`}
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#216BFF]/10">
        <span className="text-xl leading-none text-neutral-800">
          {dir === "left" ? "‹" : "›"}
        </span>
      </span>
    </button>
  );
}
