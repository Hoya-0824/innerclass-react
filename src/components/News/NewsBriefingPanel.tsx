// src/components/News/NewsBriefingPanel.tsx
import React, { useMemo } from "react";

export type BriefingExplain = {
  mode?: string;
  query_text?: string;
  market_filter?: string;
  selection_strategy?: string[];
  counts?: {
    portfolio_boost_picked?: number;
    portfolio_boost_cap?: number;
    vector_similarity_filled?: number;
    vector_candidates_considered?: number;
    unique_after_dedupe?: number;
    final_returned?: number;
    target_total?: number;
  };
  market_balance?: {
    applied?: boolean;
    target_kr?: number | null;
    target_international?: number | null;
  };
};

export type OutlookLabel = "positive" | "neutral" | "negative";

export type Outlook = {
  overall?: {
    score?: number;
    label?: OutlookLabel;
    label_kr?: string;
  } | null;
  thresholds?: {
    positive_min?: number;
    neutral_min?: number;
    negative_max?: number;
  };
  themes?: Array<{
    theme?: string;
    theme_label?: string;
    score?: number | null;
    label?: OutlookLabel;
    label_kr?: string;
    count?: number;
    outlook_text?: string;
  }>;
};

function parseQueryText(queryText?: string) {
  const qt = (queryText || "").trim();
  if (!qt) return { sectorsUsed: [] as string[], riskProfileUsed: "" };

  const mid = " 산업의 트렌드와 ";
  const tail = " 투자 정보";

  let sectorsPart = "";
  let riskPart = "";

  if (qt.includes(mid) && qt.endsWith(tail)) {
    const [left, right] = qt.split(mid);
    sectorsPart = (left || "").trim();
    riskPart = (right || "").replace(tail, "").trim();
  } else {
    const idx = qt.indexOf("트렌드와");
    if (idx >= 0) {
      sectorsPart = qt.slice(0, idx).replace("산업의", "").trim();
      riskPart = qt.slice(idx).replace("트렌드와", "").replace("투자 정보", "").trim();
    }
  }

  const sectorsUsed = sectorsPart
    .split(",")
    .map((s) => s.replace("산업의", "").trim())
    .filter(Boolean)
    .slice(0, 10);

  return { sectorsUsed, riskProfileUsed: riskPart };
}

function riskProfileMeta(code?: string) {
  const c = (code || "").trim().toUpperCase();

  if (c === "A") {
    return {
      chipLabel: "투자성향 A · 공격형",
      tone: "red" as const,
      desc: "손실 위험이 있어도 고수익을 노립니다.",
    };
  }
  if (c === "B") {
    return {
      chipLabel: "투자성향 B · 중립형",
      tone: "amber" as const,
      desc: "시장 수익률 정도면 만족합니다.",
    };
  }
  if (c === "C") {
    return {
      chipLabel: "투자성향 C · 안정형",
      tone: "green" as const,
      desc: "원금 보존과 배당이 중요합니다.",
    };
  }
  return null;
}

function Chip({
  children,
  tone = "neutral",
  title,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "blue" | "green" | "amber" | "red";
  title?: string;
}) {
  const base =
    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ring-1 " +
    "transition select-none whitespace-nowrap";
  const toneCls =
    tone === "blue"
      ? "bg-[#216BFF]/10 text-[#1B4FD6] ring-[#216BFF]/20"
      : tone === "green"
        ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20"
        : tone === "amber"
          ? "bg-amber-500/10 text-amber-700 ring-amber-500/20"
          : tone === "red"
            ? "bg-rose-500/10 text-rose-700 ring-rose-500/20"
            : "bg-neutral-900/5 text-neutral-700 ring-black/10";

  return (
    <span className={`${base} ${toneCls}`} title={title}>
      {children}
    </span>
  );
}

function toOutlookLabel(x: unknown): OutlookLabel {
  return x === "positive" || x === "negative" || x === "neutral" ? x : "neutral";
}

/** ✅ 날씨 아이콘 매핑: 좋음=해, 중립=흐림, 안좋음=비 */
function weatherEmoji(label: OutlookLabel) {
  if (label === "positive") return "☀️";
  if (label === "negative") return "🌧️";
  return "☁️";
}

function moodKr(label: OutlookLabel) {
  if (label === "positive") return "좋음";
  if (label === "negative") return "안좋음";
  return "중립";
}

function normalizeThemeLabel(raw?: string) {
  const s = (raw || "").trim();
  if (!s) return "";

  const key = s.replace(/\s+/g, "").replace(/[-_]/g, "").toUpperCase();
  const key2 = key.replace(/\//g, "");

  const map: Record<string, string> = {
    BATTERY: "배터리",
    FINANCEHOLDING: "금융/지주",
    GREENENERGY: "친환경/석유에너지",
    ICTPLATFORM: "인터넷/플랫폼",
    SEMICONDUCTORAI: "반도체/AI",
    BIOHEALTH: "바이오/헬스",
    AUTO: "자동차",

    ENERGY: "친환경/석유에너지",
    FINANCE: "금융/지주",
    HOLDING: "금융/지주",
    FINANCEHOLDINGS: "금융/지주",
    PLATFORM: "인터넷/플랫폼",
    SEMICONDUCTOR: "반도체/AI",
    AI: "반도체/AI",
    BIO: "바이오/헬스",
    HEALTH: "바이오/헬스",
    AUTOMOTIVE: "자동차",
    CAR: "자동차",
    ETC: "기타",
    OTHER: "기타",
  };

  return map[key2] || map[key] || s;
}

function computeIntegratedMood(outlook: Outlook | null): { label: OutlookLabel } {
  const themes = outlook?.themes || [];
  let wSum = 0;
  let w = 0;

  for (const t of themes) {
    const score = typeof t.score === "number" ? t.score : null;
    if (score == null) continue;
    const weight = typeof t.count === "number" && t.count > 0 ? t.count : 1;
    wSum += score * weight;
    w += weight;
  }

  if (w <= 0) return { label: "neutral" };

  const avg = wSum / w;

  const posMin = outlook?.thresholds?.positive_min ?? 66;
  const neuMin = outlook?.thresholds?.neutral_min ?? 40;

  const label: OutlookLabel = avg >= posMin ? "positive" : avg >= neuMin ? "neutral" : "negative";
  return { label };
}

function WeatherBadge({
  label,
  variant = "theme",
}: {
  label: OutlookLabel;
  variant?: "overall" | "theme";
}) {
  const emoji = weatherEmoji(label);

  if (variant === "theme") {
    return (
      <span
        aria-label={label}
        title={label === "positive" ? "좋음" : label === "negative" ? "안좋음" : "중립"}
        className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-neutral-900/5 ring-1 ring-black/10"
      >
        <span className="text-lg leading-none">{emoji}</span>
      </span>
    );
  }

  const tone: "green" | "amber" | "red" =
    label === "positive" ? "green" : label === "negative" ? "red" : "amber";

  return (
    <Chip tone={tone}>
      <span className="mr-1">{emoji}</span>
      종합 분위기: {moodKr(label)}
    </Chip>
  );
}

function OutlookGrid({ outlook }: { outlook: Outlook | null }) {
  const themes = outlook?.themes || [];
  if (!themes.length) {
    return (
      <div className="mt-4 text-xs text-gray-500">
        섹터(테마)별 분위기를 계산할 데이터가 충분하지 않습니다. (sentiment_score가 없거나 분석 데이터가 부족할 수
        있어요.)
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold text-gray-900">섹터별 분위기</div>
      </div>

      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {themes.slice(0, 9).map((t, idx) => {
          const lbl: OutlookLabel = toOutlookLabel(t.label);
          const count = t.count ?? 0;
          const title = normalizeThemeLabel(t.theme_label || t.theme || "") || "기타";

          return (
            <div
              key={`${t.theme || "theme"}-${idx}`}
              className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{title}</div>
                  <div className="mt-1 text-[11px] text-gray-500">표본 {count}개</div>
                </div>

                <WeatherBadge label={lbl} variant="theme" />
              </div>

              {t.outlook_text ? (
                <div className="mt-3 text-xs text-gray-600 leading-relaxed">{t.outlook_text}</div>
              ) : null}
            </div>
          );
        })}
      </div>

      {themes.length > 9 ? <div className="mt-2 text-[11px] text-gray-500">상위 9개 섹터만 표시했습니다.</div> : null}
    </div>
  );
}

export function BriefingPanel({
  explain,
  outlook,
}: {
  username?: string | null; // ✅ 외부에서 넘기더라도 unused 에러 방지용으로 prop 유지(사용 X)
  explain: BriefingExplain | null;
  outlook: Outlook | null;
}) {
  const qt = explain?.query_text || "";
  const { sectorsUsed, riskProfileUsed } = useMemo(() => parseQueryText(qt), [qt]);

  const picked = explain?.counts?.portfolio_boost_picked ?? 0;
  const riskMeta = useMemo(() => riskProfileMeta(riskProfileUsed), [riskProfileUsed]);

  const integrated = useMemo(() => computeIntegratedMood(outlook), [outlook]);

  return (
    <div className="mt-3">
      <div className="mt-3 rounded-2xl border border-black/5 bg-white shadow-sm">
        <div className="p-4 md:p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#216BFF]/10">
                <span className="text-neutral-900 text-base">AI</span>
              </span>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-gray-900">선정 기준 요약</div>
                <div className="text-xs text-gray-500">유사도 추천(임베딩) + 보유종목 부스팅</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {picked > 0 && <Chip tone="amber">보유종목 우선: {picked}개</Chip>}
              <WeatherBadge label={integrated.label} variant="overall" />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-900 mb-2">유사도 추천 기준 관심사</div>
            <div className="flex flex-wrap gap-2 items-center">
              {sectorsUsed.length ? (
                sectorsUsed.map((s, idx) => <Chip key={`${s}-${idx}`}>{s}</Chip>)
              ) : (
                <>
                  <Chip>경제</Chip>
                  <Chip>시장동향</Chip>
                </>
              )}

              {riskMeta ? (
                <Chip tone={riskMeta.tone} title={riskMeta.desc}>
                  {riskMeta.chipLabel}
                </Chip>
              ) : null}
            </div>
          </div>

          <OutlookGrid outlook={outlook} />
        </div>
      </div>
    </div>
  );
}
