import React, { useMemo } from "react";

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
        <span className="text-xl leading-none text-neutral-800">{dir === "left" ? "‹" : "›"}</span>
      </span>
    </button>
  );
}

export function SlideRail({
  index,
  childrenSlides,
}: {
  index: number; // 0..N-1
  childrenSlides: React.ReactNode[]; // slide들의 배열
}) {
  const translateX = useMemo(() => -(index * 100), [index]);

  return (
    <div className="relative overflow-hidden">
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
