import React, { useMemo, useRef } from "react";

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

export function SlideRail({
  index,
  childrenSlides,
  onSwipe,
}: {
  index: number; // 0..N-1
  childrenSlides: React.ReactNode[]; // slide들의 배열
  onSwipe?: (dir: "left" | "right") => void; // 모바일 스와이프 콜백
}) {
  const translateX = useMemo(() => -(index * 100), [index]);

  // Touch swipe support for mobile
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!onSwipe || touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    const isSwipeLeft = distance > minSwipeDistance;
    const isSwipeRight = distance < -minSwipeDistance;

    if (isSwipeLeft) {
      onSwipe("right"); // 오른쪽으로 스와이프 = 다음 슬라이드
    } else if (isSwipeRight) {
      onSwipe("left"); // 왼쪽으로 스와이프 = 이전 슬라이드
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div
      className="relative overflow-hidden touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex will-change-transform"
        style={{
          transform: `translateX(${translateX}%)`,
          transition: "transform 240ms ease",
        }}
      >
        {childrenSlides.map((slide, i) => (
          <div key={i} className="w-full shrink-0">
            {slide}
          </div>
        ))}
      </div>
    </div>
  );
}

