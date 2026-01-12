// src/pages/home/components/TrendNewsCarousel.tsx
import { classNames, getHost } from "../utils";
import type { TrendNewsItem, NewsDetailItem } from "../types";

export function TrendNewsCard({
  item,
  onOpen,
}: {
  item: TrendNewsItem;
  onOpen: (detail: NewsDetailItem) => void;
}) {
  const host = getHost(item.link);
  const hasImg = Boolean(item.image_url);

  return (
    <button
      type="button"
      onClick={() =>
        onOpen({
          id: item.id,                 // ✅ TrendKeywordNews.id
          analysisSource: "reco",      // ✅ 핵심: reco 분석 API 사용
          title: item.title,
          summary: item.summary,
          imageUrl: item.image_url || undefined,
          date: item.published_at,
          originUrl: item.link,
          tags: [
            host || "news",
            item.related_stock_name ? `관련: ${item.related_stock_name}` : "",
            item.related_stock_code ? `코드: ${item.related_stock_code}` : "",
          ].filter(Boolean),
          related: { name: item.related_stock_name, code: item.related_stock_code },
        })
      }
      className="group w-full overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[16/9] bg-neutral-100">
        {hasImg ? (
          <img
            src={item.image_url}
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
        <div className="line-clamp-2 text-sm font-semibold text-neutral-900">{item.title}</div>
        <div className="mt-2 line-clamp-2 text-xs text-neutral-600">{item.summary}</div>

        <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
          {host ? <span className="truncate">{host}</span> : null}
          {host && item.published_at ? <span className="text-neutral-300">•</span> : null}
          {item.published_at ? <span className="shrink-0">{item.published_at}</span> : null}
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
      className={classNames(base, pos, state)}
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#216BFF]/10">
        <span className="text-xl leading-none text-neutral-800">{dir === "left" ? "‹" : "›"}</span>
      </span>
    </button>
  );
}
