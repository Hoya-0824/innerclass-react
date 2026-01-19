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
    id: n.id, // ✅ TrendKeywordNews.id 그대로 전달
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

/**
 * TrendNewsCard
 * - 요청사항: 아래 NewsCard와 "레이아웃/스타일" 동일하게 맞춤
 *   (bg-white, border-gray-100, rounded-xl, h-40 이미지, p-5, title lg, date, summary clamp-3, tags chip)
 */
export function TrendNewsCard({
  item,
  onOpenModal,
}: {
  item: TrendNewsItem;
  onOpenModal: (modalItem: ModalNewsItem) => void;
}) {
  const modalItem = toModalItemFromTrend(item);

  return (
    <button
      type="button"
      onClick={() => onOpenModal(modalItem)}
      title={item.title}
      aria-label={`트렌드 뉴스 상세 보기: ${item.title}`}
      className="bg-white border text-left border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col h-full cursor-pointer"
    >
      {/* Image Placeholder or Actual Image */}
      <div className="h-40 bg-gray-100 flex items-center justify-center relative overflow-hidden">
        {modalItem.imageUrl ? (
          <img
            src={modalItem.imageUrl}
            alt={modalItem.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              // 이미지 로드 실패 시 "이미지" 플레이스홀더가 보이도록 img만 숨김
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="text-gray-400 text-sm font-medium">이미지</span>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-lg mb-1 line-clamp-2 leading-tight text-gray-900 border-none">
          {modalItem.title}
        </h3>
        <span className="text-xs text-gray-400 mb-3 block">{modalItem.date}</span>

        <p className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed flex-1">
          {modalItem.summary}
        </p>

        <div className="flex flex-wrap gap-2 mt-auto">
          {modalItem.tags?.map((tag, idx) => (
            <span
              key={`${tag}-${idx}`}
              className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-md hover:bg-gray-200 transition-colors cursor-pointer font-medium"
            // 태그 클릭이 카드 클릭(모달 오픈)으로 전파되는 걸 막고 싶으면 아래 주석 해제
            // onClick={(e) => e.stopPropagation()}
            // onMouseDown={(e) => e.stopPropagation()}
            >
              {tag}
            </span>
          ))}
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
  // PC: 캐러셀 외부에 배치 (-left-14, -right-14)
  // Mobile: 숨김 (hidden md:flex) - 스와이프로 대체
  const base =
    "absolute top-1/2 -translate-y-1/2 z-10 rounded-full p-2 sm:p-2.5 transition hidden md:flex";
  const pos = dir === "left" ? "md:-left-14 left-2" : "md:-right-14 right-2";
  const state = disabled
    ? "opacity-30 cursor-default ring-black/5"
    : "opacity-100 cursor-pointer ring-black/10 hover:ring-black/20";

  return (
    <button
      type="button"
      aria-label={dir === "left" ? "이전" : "다음"}
      disabled={disabled}
      onClick={onClick}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      className={`${base} ${pos} ${state}`}
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200/80 hover:bg-neutral-300 transition-colors">
        <svg
          className="h-5 w-5 text-neutral-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
        >
          {dir === "left" ? (
            <path d="M15 18l-6-6 6-6" />
          ) : (
            <path d="M9 18l6-6-6-6" />
          )}
        </svg>
      </span>
    </button>
  );
}
