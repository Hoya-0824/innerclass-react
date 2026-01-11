// src/pages/Home.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

/** ===== Today Market API ===== */
type MarketCode = "KOSDAQ" | "KOSPI" | "NASDAQ";

type StockRow = {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;

  open: number | null;
  close: number | null;

  // ✅ percent points (e.g. 30.0 => 30%, -5.01 => -5%)
  intraday_pct: number | null;
  change_pct: number | null;

  market_cap: number | null;
  volume: number | null;
  date: string;

  spark?: number[];
};

type TodayMarketResponse = {
  market: MarketCode;
  exchange?: string | null;
  asof: string;

  top_market_cap: StockRow[];
  top_gainers: StockRow[];
  top_drawdown: StockRow[];
};

/** ===== Raw Today Market API (backend 실제 응답) ===== */
type TodayMarketRawRow = {
  rank: number;
  symbol_code: string; // e.g. "A005930" or "AAPL"
  name: string;
  trade_price: number | null;

  // ✅ backend에서 스케일이 섞여 올 수 있음
  // - 30.0 (퍼센트포인트)
  // - -0.05017561 (ratio = -5.017%)
  change_rate: number | null;

  payload?: any; // include_payload=1일 때
};

type TodayMarketRawResponse = {
  market: MarketCode;
  asof: string;
  top_market_cap: TodayMarketRawRow[];
  top_gainers: TodayMarketRawRow[];
  top_drawdown: TodayMarketRawRow[];
};

/** ===== Trend Keywords API ===== */
type TrendScope = "KR" | "US";

type TrendNewsItem = {
  title: string;
  summary: string;
  link: string;
  image_url: string;
  published_at: string;
  needs_image_gen?: boolean;

  related_stock_name?: string;
  related_stock_code?: string;
};

type TrendKeywordItem = {
  keyword: string;
  reason: string;
  news?: TrendNewsItem[];
};

type TrendKeywordsResponse = {
  scope: TrendScope;
  date: string;
  items: TrendKeywordItem[];
};

type TrendTab = {
  id: string; // `${scope}:${keyword}:${index}`
  scope: TrendScope;
  keyword: string;
  reason: string;
  news: TrendNewsItem[];
  date: string;
};

/** ===== Sector News API ===== */
type NewsMarketFilter = "all" | "domestic" | "international";

type SectorItem = {
  sector: string;
  label: string;
  count: number;
};

type SectorListResponse = {
  market: NewsMarketFilter;
  items: SectorItem[];
};

type SectorNewsRow = {
  id: number;
  title: string;

  related_name?: string;
  ticker?: string;

  published_at: string;
  url: string;

  market: "KR" | "INTERNATIONAL" | string;

  sector: string;
};

type SectorNewsResponse = {
  sector: string;
  label: string;
  market: NewsMarketFilter;
  news: SectorNewsRow[];
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

/**
 * ✅ percent points 기반 표기
 *  - 30.0 -> "+30%"
 *  - -5.01 -> "-5%"
 *  - 0.49 -> "0%" (기본은 정수 표시)
 */
function formatPct(x: number | null | undefined): string {
  if (x === null || x === undefined || Number.isNaN(x)) return "-";
  const v = Math.trunc(x);
  if (v > 0) return `+${v}%`;
  if (v < 0) return `${v}%`;
  return "0%";
}

function getAccessToken(): string | null {
  return localStorage.getItem("access_token");
}

function formatDateTimeKST(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day} ${hh}:${mm}`;
  } catch {
    return "";
  }
}

/**
 * ✅ change_rate 스케일 혼재 교정
 * - abs(x) <= 1.0 인 경우: ratio(0.3=30%)로 보고 *100
 * - 그 외: percent points로 간주(30=30%)
 */
function normalizePctPoints(x: number | null | undefined): number | null {
  if (x === null || x === undefined || Number.isNaN(x)) return null;

  const ax = Math.abs(x);

  // ratio로 오는 케이스(대개 0.xx)
  if (ax > 0 && ax <= 1.0) {
    return x * 100.0;
  }

  // percent points로 오는 케이스(대개 1~30 정도)
  return x;
}

function formatPriceByMarket(marketLabel: string, price: number | null | undefined): string {
  if (price === null || price === undefined || Number.isNaN(price)) return "-";

  const mk = (marketLabel || "").toUpperCase();
  if (mk === "NASDAQ") {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
        Math.trunc(price)
      );
    } catch {
      return `$${Math.trunc(price).toLocaleString("en-US")}`;
    }
  }

  // KOSPI / KOSDAQ
  try {
    return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(
      Math.trunc(price)
    );
  } catch {
    return `₩${Math.trunc(price).toLocaleString("ko-KR")}`;
  }
}

/** ===== Arrow badge ===== */
function ArrowBadge({ pct }: { pct: number | null }) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 ring-1 ring-black/5">
        —
      </span>
    );
  }

  if (pct === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-bold text-neutral-700 ring-1 ring-black/5">
        0%
      </span>
    );
  }

  const up = pct > 0;
  const bg = up ? "bg-rose-50 ring-rose-200 text-rose-700" : "bg-blue-50 ring-blue-200 text-blue-700";
  return (
    <span className={classNames("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1", bg)}>
      <span className="leading-none">{up ? "▲" : "▼"}</span>
      <span className="tabular-nums">{formatPct(pct)}</span>
    </span>
  );
}

/** ===== Backend -> Front mapping ===== */
function mapRawRowToStockRow(raw: TodayMarketRawRow, asof: string, opts?: { forceNegative?: boolean }): StockRow {
  const symbol = (raw.symbol_code ?? "").trim();
  const price = raw.trade_price ?? null;

  // ✅ 스케일 교정
  let pct = normalizePctPoints(raw.change_rate);

  // ✅ drawdown에서 혹시 양수로 오면(소스 이슈) 강제 음수 처리
  if (opts?.forceNegative && pct !== null && pct > 0) {
    pct = -pct;
  }

  // payload에서 spark 후보를 최대한 유연하게 찾음
  const p = raw.payload ?? {};
  const sparkCandidate =
    p?.spark ??
    p?.sparkline ??
    p?.chart_prices ??
    p?.prices ??
    p?.chart?.prices ??
    p?.chart?.data ??
    p?.mini_chart ??
    null;

  const spark = Array.isArray(sparkCandidate)
    ? sparkCandidate
        .map((x: any) => (typeof x === "number" ? x : Number(x)))
        .filter((x: any) => Number.isFinite(x))
    : undefined;

  return {
    symbol,
    name: raw.name ?? symbol,
    exchange: "",
    currency: "",
    open: null,
    close: price,
    intraday_pct: pct,
    change_pct: pct,
    market_cap: null,
    volume: null,
    date: asof,
    spark,
  };
}

async function fetchTodayMarket(
  params: { market: MarketCode; date?: string; limit?: number },
  signal?: AbortSignal
): Promise<TodayMarketResponse> {
  const qs = new URLSearchParams();
  qs.set("market", params.market);
  if (params.date) qs.set("date", params.date);
  if (params.limit) qs.set("limit", String(params.limit));

  // ✅ chart/추가 정보가 payload에 있을 수 있으니 include_payload=1
  qs.set("include_payload", "1");

  const url = `${API_BASE_URL}/api/markets/today/?${qs.toString()}`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`today_market fetch failed: ${res.status}`);

  const raw = (await res.json()) as TodayMarketRawResponse;

  return {
    market: raw.market,
    asof: raw.asof,
    top_market_cap: (raw.top_market_cap ?? []).map((r) => mapRawRowToStockRow(r, raw.asof)),
    top_gainers: (raw.top_gainers ?? []).map((r) => mapRawRowToStockRow(r, raw.asof)),
    // ✅ drawdown은 음수 보정 옵션 적용
    top_drawdown: (raw.top_drawdown ?? []).map((r) => mapRawRowToStockRow(r, raw.asof, { forceNegative: true })),
  };
}

async function fetchTrendKeywords(
  params: { scope: TrendScope; limit?: number; with_news?: 0 | 1 },
  signal?: AbortSignal
): Promise<TrendKeywordsResponse> {
  const qs = new URLSearchParams();
  qs.set("scope", params.scope);
  qs.set("limit", String(params.limit ?? 3));
  qs.set("with_news", String(params.with_news ?? 1));

  const url = `${API_BASE_URL}/api/recommend/keywords/?${qs.toString()}`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`trend_keywords fetch failed: ${res.status}`);
  return res.json();
}

/** ===== sector APIs ===== */
async function fetchSectorList(params: { market?: NewsMarketFilter }, signal?: AbortSignal): Promise<SectorListResponse> {
  const qs = new URLSearchParams();
  if (params.market) qs.set("market", params.market);
  const url = `${API_BASE_URL}/api/news/sectors/?${qs.toString()}`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`sector_list fetch failed: ${res.status}`);
  return res.json();
}

async function fetchNewsBySector(
  params: { sector: string; market?: NewsMarketFilter; limit?: number },
  signal?: AbortSignal
): Promise<SectorNewsResponse> {
  const qs = new URLSearchParams();
  qs.set("sector", params.sector);
  if (params.market) qs.set("market", params.market);
  qs.set("limit", String(params.limit ?? 30));
  const url = `${API_BASE_URL}/api/news/by-sector/?${qs.toString()}`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`news_by_sector fetch failed: ${res.status}`);
  return res.json();
}

function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-lg font-semibold text-neutral-900">{title}</div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

/** ============================
 *  ✅ 오늘의 증시 UI
 *  - TOP1 제거
 *  - 하단 우측 KOSDAQ/KOSPI/NASDAQ 제거
 *  - 카드 세로 높이 축소(가로 비율 유지)
 *  - 가격을 상승/하락 아이콘(ArrowBadge) 바로 왼쪽으로 이동
 * ============================ */
function MarketPill({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#216BFF]/10 px-2.5 py-1 text-[11px] font-bold text-[#216BFF]">
      {text}
    </span>
  );
}

function PricePill({ marketLabel, price }: { marketLabel: string; price: number | null }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[12px] font-extrabold text-neutral-900 ring-1 ring-black/10 tabular-nums">
      {formatPriceByMarket(marketLabel, price)}
    </span>
  );
}

function MoverTile({
  kind,
  row,
  marketLabel,
}: {
  kind: "gainer" | "loser";
  row: StockRow | null;
  marketLabel: string;
}) {
  const isGainer = kind === "gainer";
  const label = isGainer ? "급상승 1위" : "급하락 1위";

  if (!row) {
    return (
      <div className="rounded-2xl bg-white p-3 ring-1 ring-black/5">
        <div className="text-[11px] font-semibold text-neutral-500">{label}</div>
        <div className="mt-2 text-sm text-neutral-500">데이터가 없습니다.</div>
      </div>
    );
  }

  const price = row.close ?? null;
  const pct = row.intraday_pct ?? row.change_pct ?? null;

  return (
    <div className={classNames("rounded-2xl bg-white p-3 ring-1 ring-black/5 transition", "hover:shadow-sm hover:ring-black/10")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-neutral-500">{label}</div>
          <div className="mt-1 truncate text-[14px] font-extrabold text-neutral-900">{row.name}</div>

          <div className="mt-1.5 flex items-center gap-2 text-xs text-neutral-500">
            <span className="truncate font-semibold text-neutral-700">{row.symbol}</span>
            <span className="text-neutral-300">•</span>
            <span className="text-[11px] font-semibold text-neutral-500">{marketLabel}</span>
          </div>
        </div>

        {/* ✅ 가격을 ArrowBadge 바로 왼쪽에 배치 */}
        <div className="shrink-0 flex items-center gap-2">
          <PricePill marketLabel={marketLabel} price={price} />
          <ArrowBadge pct={pct} />
        </div>
      </div>

      {/* ✅ 카드 높이 축소를 위해 중간 divider/큰 여백 제거 */}
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <div
          className={classNames(
            "inline-flex items-center gap-2 rounded-full px-2.5 py-1 font-semibold ring-1",
            isGainer ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-blue-50 text-blue-700 ring-blue-200"
          )}
        >
          <span className="leading-none">{isGainer ? "▲" : "▼"}</span>
          <span>{isGainer ? "상승 모멘텀" : "하락 압력"}</span>
        </div>

        {/* ✅ 우측 KOSDAQ/KOSPI/NASDAQ 텍스트 제거 */}
        <div />
      </div>
    </div>
  );
}

function MarketMoversCard({
  title,
  marketLabel,
  topGainer,
  topLoser,
}: {
  title: string;
  marketLabel: string;
  topGainer: StockRow | null;
  topLoser: StockRow | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-[#216BFF]/8 to-transparent" />

      {/* ✅ 전체 padding 줄여서 높이 축소 */}
      <div className="relative p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-sm font-extrabold text-neutral-900">{title}</div>
              <MarketPill text={marketLabel} />
            </div>
          </div>

          {/* ✅ TOP1 뱃지 제거 */}
          <div />
        </div>

        <div className="mt-2.5 grid grid-cols-1 gap-2.5">
          <MoverTile kind="gainer" row={topGainer} marketLabel={marketLabel} />
          <MoverTile kind="loser" row={topLoser} marketLabel={marketLabel} />
        </div>
      </div>
    </div>
  );
}

/** ===== Trend UI helpers ===== */
function getHost(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function TrendNewsCard({ item }: { item: TrendNewsItem }) {
  const host = getHost(item.link);
  const hasImg = Boolean(item.image_url);

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noreferrer"
      className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 hover:shadow-md transition-shadow"
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity" />
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
    </a>
  );
}

/** ===== Cute arrow buttons (no external icons) ===== */
function CarouselArrowButton({
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

/** ===== Sector UI ===== */
function SectorLeftItem({
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

function SectorScrollButton({
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

function SectorNewsRowItem({ row }: { row: SectorNewsRow }) {
  const tag = pickMarketTag(row);
  const dt = formatDateTimeKST(row.published_at);

  return (
    <a href={row.url} target="_blank" rel="noreferrer" className="group block" title={row.title}>
      {/* ✅ 태그 왼쪽 살짝 잘리는 현상 방지: px-0.5 + 태그에 ml-0.5 */}
      <div className="flex items-center gap-3 border-b border-neutral-200/70 py-2.5 px-0.5">
        <div className="shrink-0">
          <span
            className={classNames(
              "inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold ring-1 ml-0.5",
              tag.cls
            )}
          >
            {tag.text}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-neutral-900 group-hover:text-neutral-950">{row.title}</div>
        </div>

        <div className="shrink-0 text-[12px] text-neutral-400 tabular-nums">{dt}</div>
      </div>
    </a>
  );
}

const Home = () => {
  const navigate = useNavigate();

  const [dKosdaq, setDKosdaq] = useState<TodayMarketResponse | null>(null);
  const [dKospi, setDKospi] = useState<TodayMarketResponse | null>(null);
  const [dNasdaq, setDNasdaq] = useState<TodayMarketResponse | null>(null);

  const [chatDraft, setChatDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const controllerRef = useRef<AbortController | null>(null);
  const runSeqRef = useRef<number>(0);

  /** ===== Trend state ===== */
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendErr, setTrendErr] = useState<string>("");
  const [trendTabs, setTrendTabs] = useState<TrendTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");

  const trendAbortRef = useRef<AbortController | null>(null);
  const trendRunSeqRef = useRef<number>(0);

  /** ✅ Trend carousel index 기반 (스크롤바 제거) */
  const carouselWrapRef = useRef<HTMLDivElement | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselCanLeft, setCarouselCanLeft] = useState(false);
  const [carouselCanRight, setCarouselCanRight] = useState(false);
  const [cardW, setCardW] = useState(360);
  const gap = 16;

  const activeTab = useMemo(() => trendTabs.find((t) => t.id === activeTabId) ?? null, [trendTabs, activeTabId]);

  const recomputeCardWidth = () => {
    const w = window.innerWidth;
    if (w >= 1024) return 360;
    if (w >= 640) return 340;
    return 320;
  };

  const getVisibleCount = () => {
    const el = carouselWrapRef.current;
    if (!el) return 1;
    const vw = el.clientWidth;
    const one = cardW + gap;
    return Math.max(1, Math.floor((vw + gap) / one));
  };

  const updateCarouselButtons = () => {
    const n = activeTab?.news?.length ?? 0;
    const visible = getVisibleCount();
    const maxIdx = Math.max(0, n - visible);
    setCarouselCanLeft(carouselIndex > 0);
    setCarouselCanRight(carouselIndex < maxIdx);
  };

  const clampCarouselIndex = (idx: number) => {
    const n = activeTab?.news?.length ?? 0;
    const visible = getVisibleCount();
    const maxIdx = Math.max(0, n - visible);
    return Math.max(0, Math.min(idx, maxIdx));
  };

  /** ===== Sector state ===== */
  const [sectorLoading, setSectorLoading] = useState(false);
  const [sectorErr, setSectorErr] = useState<string>("");
  const [sectorItems, setSectorItems] = useState<SectorItem[]>([]);
  const [activeSector, setActiveSector] = useState<string>("");

  const [sectorNewsLoading, setSectorNewsLoading] = useState(false);
  const [sectorNewsErr, setSectorNewsErr] = useState<string>("");
  const [sectorNews, setSectorNews] = useState<SectorNewsRow[]>([]);

  const sectorAbortRef = useRef<AbortController | null>(null);
  const sectorNewsAbortRef = useRef<AbortController | null>(null);

  /** ✅ 섹터 리스트: "섹터 양"에 맞게 높이 자동 축소 (최대 5개까지만) */
  const sectorItemsRef = useRef<HTMLDivElement | null>(null);
  const [canSectorItemsUp, setCanSectorItemsUp] = useState(false);
  const [canSectorItemsDown, setCanSectorItemsDown] = useState(false);

  /** ✅ 섹터 뉴스 리스트 스크롤 버튼 */
  const sectorNewsListRef = useRef<HTMLDivElement | null>(null);
  const [canSectorUp, setCanSectorUp] = useState(false);
  const [canSectorDown, setCanSectorDown] = useState(false);

  const updateScrollState = (el: HTMLDivElement | null, setUp: (v: boolean) => void, setDown: (v: boolean) => void) => {
    if (!el) {
      setUp(false);
      setDown(false);
      return;
    }
    const top = el.scrollTop;
    const max = el.scrollHeight - el.clientHeight;
    setUp(top > 2);
    setDown(max - top > 2);
  };

  const updateSectorItemsScrollState = () =>
    updateScrollState(sectorItemsRef.current, setCanSectorItemsUp, setCanSectorItemsDown);

  const updateSectorNewsScrollState = () =>
    updateScrollState(sectorNewsListRef.current, setCanSectorUp, setCanSectorDown);

  const scrollListBy = (el: HTMLDivElement | null, dir: "up" | "down") => {
    if (!el) return;
    const dy = Math.max(120, Math.floor(el.clientHeight * 0.8));
    el.scrollBy({ top: dir === "up" ? -dy : dy, behavior: "smooth" });
    window.setTimeout(() => {
      if (el === sectorItemsRef.current) updateSectorItemsScrollState();
      if (el === sectorNewsListRef.current) updateSectorNewsScrollState();
    }, 120);
  };

  const goChatbot = (text: string) => {
    const t = text.trim();
    if (!t) return;
    sessionStorage.setItem("chatbot_draft", t);
    sessionStorage.setItem("chatbot_autosend", "1");
    navigate("/chatbot");
  };

  // today_market polling (5분)
  useEffect(() => {
    const run = async () => {
      if (controllerRef.current) controllerRef.current.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      const mySeq = ++runSeqRef.current;
      setLoading(true);
      setErr("");

      try {
        const [a, b, c] = await Promise.all([
          fetchTodayMarket({ market: "KOSDAQ", limit: 5 }, controller.signal),
          fetchTodayMarket({ market: "KOSPI", limit: 5 }, controller.signal),
          fetchTodayMarket({ market: "NASDAQ", limit: 5 }, controller.signal),
        ]);

        if (mySeq !== runSeqRef.current) return;
        setDKosdaq(a);
        setDKospi(b);
        setDNasdaq(c);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setErr(e?.message ?? "Failed to load");
      } finally {
        setLoading(false);
      }
    };

    run();
    const t = window.setInterval(run, 5 * 60 * 1000);
    return () => {
      window.clearInterval(t);
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, []);

  /** ===== Trend polling (10분) : KR + US 가져와서 탭 구성 ===== */
  useEffect(() => {
    const run = async () => {
      if (trendAbortRef.current) trendAbortRef.current.abort();
      const controller = new AbortController();
      trendAbortRef.current = controller;

      const mySeq = ++trendRunSeqRef.current;
      setTrendLoading(true);
      setTrendErr("");

      try {
        const [kr, us] = await Promise.all([
          fetchTrendKeywords({ scope: "KR", limit: 3, with_news: 1 }, controller.signal),
          fetchTrendKeywords({ scope: "US", limit: 3, with_news: 1 }, controller.signal),
        ]);

        if (mySeq !== trendRunSeqRef.current) return;

        const toTabs = (resp: TrendKeywordsResponse): TrendTab[] =>
          (resp.items ?? [])
            .filter((x) => (x.keyword || "").trim().length > 0)
            .map((x, idx) => ({
              id: `${resp.scope}:${x.keyword}:${idx}`,
              scope: resp.scope,
              keyword: x.keyword,
              reason: x.reason ?? "",
              news: (x.news ?? []).filter((n) => (n.link || "").trim().length > 0).slice(0, 15),
              date: resp.date,
            }));

        const tabs = [...toTabs(kr), ...toTabs(us)];
        setTrendTabs(tabs);

        setActiveTabId((prev) => {
          if (prev && tabs.some((t) => t.id === prev)) return prev;
          return tabs[0]?.id ?? "";
        });
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setTrendErr(e?.message ?? "Failed to load trends");
      } finally {
        setTrendLoading(false);
      }
    };

    run();
    const t = window.setInterval(run, 10 * 60 * 1000);
    return () => {
      window.clearInterval(t);
      if (trendAbortRef.current) trendAbortRef.current.abort();
    };
  }, []);

  /** ===== Sector list load (Home mount) ===== */
  useEffect(() => {
    const run = async () => {
      if (sectorAbortRef.current) sectorAbortRef.current.abort();
      const controller = new AbortController();
      sectorAbortRef.current = controller;

      setSectorLoading(true);
      setSectorErr("");

      try {
        const resp = await fetchSectorList({ market: "all" }, controller.signal);
        const items = resp.items ?? [];
        setSectorItems(items);

        setActiveSector((prev) => {
          if (prev && items.some((x) => x.sector === prev)) return prev;
          return items[0]?.sector ?? "";
        });

        window.setTimeout(updateSectorItemsScrollState, 0);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setSectorErr(e?.message ?? "Failed to load sectors");
      } finally {
        setSectorLoading(false);
      }
    };

    run();
    return () => {
      if (sectorAbortRef.current) sectorAbortRef.current.abort();
    };
  }, []);

  /** ===== Load news when sector changes (MAX 30) ===== */
  useEffect(() => {
    if (!activeSector) return;

    const run = async () => {
      if (sectorNewsAbortRef.current) sectorNewsAbortRef.current.abort();
      const controller = new AbortController();
      sectorNewsAbortRef.current = controller;

      setSectorNewsLoading(true);
      setSectorNewsErr("");

      try {
        const resp = await fetchNewsBySector({ sector: activeSector, market: "all", limit: 30 }, controller.signal);
        setSectorNews((resp.news ?? []).slice(0, 30));

        window.setTimeout(() => {
          const el = sectorNewsListRef.current;
          if (el) el.scrollTo({ top: 0, behavior: "auto" });
          updateSectorNewsScrollState();
        }, 0);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setSectorNewsErr(e?.message ?? "Failed to load sector news");
      } finally {
        setSectorNewsLoading(false);
      }
    };

    run();
    return () => {
      if (sectorNewsAbortRef.current) sectorNewsAbortRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSector]);

  /** ✅ Trend carousel: 리사이즈/탭 변경 시 index/버튼 상태 갱신 */
  useEffect(() => {
    const w = recomputeCardWidth();
    setCardW(w);
    setCarouselIndex(0);
    window.setTimeout(updateCarouselButtons, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId]);

  useEffect(() => {
    const onResize = () => {
      setCardW(recomputeCardWidth());
      setCarouselIndex((prev) => clampCarouselIndex(prev));
      window.setTimeout(updateCarouselButtons, 0);

      updateSectorItemsScrollState();
      updateSectorNewsScrollState();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, activeTab?.news?.length]);

  useEffect(() => {
    setCarouselIndex((prev) => clampCarouselIndex(prev));
    window.setTimeout(updateCarouselButtons, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carouselIndex, cardW, activeTab?.news?.length]);

  useEffect(() => {
    const elA = sectorItemsRef.current;
    const elB = sectorNewsListRef.current;

    const onScrollA = () => updateSectorItemsScrollState();
    const onScrollB = () => updateSectorNewsScrollState();

    elA?.addEventListener("scroll", onScrollA);
    elB?.addEventListener("scroll", onScrollB);

    updateSectorItemsScrollState();
    updateSectorNewsScrollState();

    return () => {
      elA?.removeEventListener("scroll", onScrollA);
      elB?.removeEventListener("scroll", onScrollB);
    };
  }, [sectorItems.length, sectorNews.length, sectorNewsLoading, sectorLoading]);

  const kosdaqTopGainer = useMemo(() => dKosdaq?.top_gainers?.[0] ?? null, [dKosdaq]);
  const kosdaqTopLoser = useMemo(() => dKosdaq?.top_drawdown?.[0] ?? null, [dKosdaq]);

  const kospiTopGainer = useMemo(() => dKospi?.top_gainers?.[0] ?? null, [dKospi]);
  const kospiTopLoser = useMemo(() => dKospi?.top_drawdown?.[0] ?? null, [dKospi]);

  const nasdaqTopGainer = useMemo(() => dNasdaq?.top_gainers?.[0] ?? null, [dNasdaq]);
  const nasdaqTopLoser = useMemo(() => dNasdaq?.top_drawdown?.[0] ?? null, [dNasdaq]);

  const activeSectorLabel = useMemo(() => {
    const it = sectorItems.find((x) => x.sector === activeSector);
    return it?.label ?? "산업 뉴스";
  }, [sectorItems, activeSector]);

  const goCarousel = (dir: "left" | "right") => {
    const delta = dir === "left" ? -1 : 1;
    setCarouselIndex((prev) => clampCarouselIndex(prev + delta));
  };

  const translateX = useMemo(() => {
    const one = cardW + gap;
    return -(carouselIndex * one);
  }, [carouselIndex, cardW]);

  /** ✅ 섹터 리스트 높이: 아이템 수에 맞게(최대 5개까지) 자동 축소 */
  const sectorListHeightPx = useMemo(() => {
    const visible = Math.max(1, Math.min(5, sectorItems.length || 1));
    // SectorLeftItem: py-2 + text line -> 대략 40~42px, gap(space-y-1=4px)
    // 여유 포함해서 44px로 스냅
    const rowH = 44;
    const gapH = 4; // space-y-1
    return visible * rowH + Math.max(0, visible - 1) * gapH;
  }, [sectorItems.length]);

  return (
    <div className="min-h-screen bg-[#f6f7f9]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* 상단 채팅 입력 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="inline-flex items-center rounded-full bg-[#216BFF]/10 px-3 py-1 text-xs font-semibold text-[#216BFF]">
                AI에게 물어보세요
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 rounded-2xl bg-[#f7f8fa] p-1 ring-1 ring-black/5">
                <input
                  className="w-full rounded-[14px] bg-transparent px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-[#216BFF]/25"
                  placeholder="예) 오늘 코스닥 급등주 중 리스크 요인 알려줘"
                  value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      goChatbot(chatDraft);
                    }
                  }}
                />
              </div>

              <button
                type="button"
                disabled={chatDraft.trim().length === 0}
                className="rounded-2xl bg-[#216BFF] px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-[#216BFF]/20 hover:opacity-95 disabled:opacity-50"
                onClick={() => {
                  if (!getAccessToken()) {
                    navigate("/login");
                    return;
                  }
                  goChatbot(chatDraft);
                }}
              >
                전송
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {["내 관심종목 뉴스 요약해줘", "오늘 시장 분위기 3줄 요약", "나스닥 프리마켓 급등 이유?", "급등주 리스크 체크리스트"].map(
                (q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => goChatbot(q)}
                    className="rounded-full bg-white px-3 py-2 text-sm font-medium text-neutral-700 ring-1 ring-black/5 hover:bg-[#216BFF]/5 hover:text-neutral-900"
                  >
                    {q}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* 상태 */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="text-sm text-neutral-500">{loading ? "로딩 중..." : err ? err : ""}</div>
        </div>

        {/* 오늘의 트렌드 뉴스 */}
        <div className="mt-6">
          <SectionTitle title="오늘의 트렌드 뉴스" />

          {/* 키워드 탭 */}
          <div className="mt-3">
            {trendLoading ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-9 w-24 rounded-full bg-neutral-100 ring-1 ring-black/5" />
                ))}
              </div>
            ) : trendErr ? (
              <div className="rounded-2xl bg-white p-4 text-sm text-neutral-600 ring-1 ring-black/5">
                트렌드 데이터를 불러오지 못했습니다. {trendErr}
              </div>
            ) : trendTabs.length === 0 ? (
              <div className="rounded-2xl bg-white p-4 text-sm text-neutral-600 ring-1 ring-black/5">표시할 트렌드 키워드가 없습니다.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {trendTabs.map((t) => {
                  const active = t.id === activeTabId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTabId(t.id)}
                      className={classNames(
                        "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ring-1 transition-colors",
                        active
                          ? "bg-[#216BFF] text-white ring-[#216BFF]/30"
                          : "bg-white text-neutral-700 ring-black/5 hover:bg-[#216BFF]/5 hover:text-neutral-900"
                      )}
                      title={t.reason}
                    >
                      <span
                        className={classNames(
                          "rounded-full px-2 py-0.5 text-[11px] font-bold",
                          t.scope === "KR"
                            ? active
                              ? "bg-white/15 text-white"
                              : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : active
                            ? "bg-white/15 text-white"
                            : "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                        )}
                      >
                        {t.scope}
                      </span>
                      <span className="max-w-[12rem] truncate">{t.keyword}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 캐러셀 */}
          <div className="mt-3">
            {trendLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                    <div className="relative aspect-[16/9] bg-neutral-100" />
                    <div className="p-3">
                      <div className="h-4 w-5/6 rounded bg-neutral-100" />
                      <div className="mt-2 h-3 w-full rounded bg-neutral-100" />
                      <div className="mt-1 h-3 w-4/5 rounded bg-neutral-100" />
                      <div className="mt-3 h-3 w-2/5 rounded bg-neutral-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activeTab && activeTab.news.length > 0 ? (
              <div className="rounded-2xl bg-neutral-50 p-3 ring-1 ring-black/5">
                {activeTab.reason ? (
                  <div className="mb-3 text-xs text-neutral-600">
                    <span className="font-semibold text-neutral-800">{activeTab.keyword}</span>
                    <span className="text-neutral-300"> • </span>
                    <span>{activeTab.reason}</span>
                  </div>
                ) : null}

                <div className="relative">
                  <CarouselArrowButton dir="left" disabled={!carouselCanLeft} onClick={() => goCarousel("left")} />
                  <CarouselArrowButton dir="right" disabled={!carouselCanRight} onClick={() => goCarousel("right")} />

                  <div
                    ref={carouselWrapRef}
                    className="overflow-hidden"
                    onWheel={(e) => {
                      e.preventDefault();
                    }}
                  >
                    <div
                      className="flex gap-4 will-change-transform"
                      style={{ transform: `translateX(${translateX}px)`, transition: "transform 220ms ease" }}
                    >
                      {activeTab.news.map((n, idx) => (
                        <div key={`${activeTab.id}:${idx}`} className="shrink-0 w-[320px] sm:w-[340px] lg:w-[360px]">
                          <TrendNewsCard item={n} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white p-4 text-sm text-neutral-600 ring-1 ring-black/5">선택한 키워드에 대한 뉴스가 없습니다.</div>
            )}
          </div>
        </div>

        {/* 산업으로 보는 뉴스 */}
        <div className="mt-6">
          <SectionTitle title="산업으로 보는 뉴스" />

          <div className="mt-4 rounded-2xl bg-white p-3 ring-1 ring-black/10">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              {/* Left */}
              <div className="lg:col-span-4">
                <div className="h-full rounded-2xl bg-white ring-1 ring-black/10">
                  <div className="flex items-center justify-between px-3.5 pt-3">
                    <div className="text-[14px] font-semibold text-neutral-900">섹터</div>
                    <div className="flex items-center gap-1.5">
                      <SectorScrollButton dir="up" disabled={!canSectorItemsUp} onClick={() => scrollListBy(sectorItemsRef.current, "up")} />
                      <SectorScrollButton
                        dir="down"
                        disabled={!canSectorItemsDown}
                        onClick={() => scrollListBy(sectorItemsRef.current, "down")}
                      />
                    </div>
                  </div>

                  <div className="p-2.5">
                    {sectorLoading ? (
                      <div className="space-y-1.5">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="h-9 rounded-lg bg-neutral-50 ring-1 ring-black/5" />
                        ))}
                      </div>
                    ) : sectorErr ? (
                      <div className="rounded-2xl bg-white p-3 text-sm text-neutral-600 ring-1 ring-black/5">
                        섹터 목록을 불러오지 못했습니다. {sectorErr}
                      </div>
                    ) : sectorItems.length === 0 ? (
                      <div className="rounded-2xl bg-white p-3 text-sm text-neutral-600 ring-1 ring-black/5">표시할 섹터가 없습니다.</div>
                    ) : (
                      <div
                        ref={sectorItemsRef}
                        className={classNames("space-y-1 overflow-y-auto pr-1")}
                        style={{
                          // ✅ 섹터 개수에 맞게 세로 축소, 단 5개 초과면 스크롤
                          height: sectorListHeightPx,
                          maxHeight: 220,
                        }}
                      >
                        {sectorItems.map((s) => (
                          <SectorLeftItem
                            key={s.sector}
                            active={s.sector === activeSector}
                            label={s.label}
                            onClick={() => setActiveSector(s.sector)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right */}
              <div className="lg:col-span-8">
                <div className="relative h-full rounded-2xl bg-white ring-1 ring-black/10">
                  <div className="flex items-center justify-between px-3.5 pt-3">
                    <div className="text-[15px] font-semibold text-neutral-900">{activeSectorLabel}</div>
                    <div className="flex items-center gap-1.5">
                      <SectorScrollButton dir="up" disabled={!canSectorUp} onClick={() => scrollListBy(sectorNewsListRef.current, "up")} />
                      <SectorScrollButton
                        dir="down"
                        disabled={!canSectorDown}
                        onClick={() => scrollListBy(sectorNewsListRef.current, "down")}
                      />
                    </div>
                  </div>

                  <div className="px-3.5 pb-3 pt-1.5">
                    {sectorNewsLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="h-10 rounded-lg bg-neutral-50 ring-1 ring-black/5" />
                        ))}
                      </div>
                    ) : sectorNewsErr ? (
                      <div className="rounded-2xl bg-white p-3 text-sm text-neutral-600 ring-1 ring-black/5">
                        섹터 뉴스를 불러오지 못했습니다. {sectorNewsErr}
                      </div>
                    ) : sectorNews.length === 0 ? (
                      <div className="rounded-2xl bg-white p-3 text-sm text-neutral-600 ring-1 ring-black/5">해당 섹터의 뉴스가 없습니다.</div>
                    ) : (
                      <div
                        ref={sectorNewsListRef}
                        className={classNames(
                          "mt-1 overflow-y-auto pr-1",
                          // ✅ 섹션 전체가 너무 길어보여서 세로를 살짝 축소(가로는 유지)
                          "h-[210px] sm:h-[230px] lg:h-[240px]"
                        )}
                      >
                        {sectorNews.slice(0, 30).map((row) => (
                          <SectorNewsRowItem key={row.id} row={row} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 오늘의 증시 */}
        <div className="mt-6">
          <SectionTitle title="오늘의 증시" />
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <MarketMoversCard title="코스닥" marketLabel="KOSDAQ" topGainer={kosdaqTopGainer} topLoser={kosdaqTopLoser} />
            <MarketMoversCard title="코스피" marketLabel="KOSPI" topGainer={kospiTopGainer} topLoser={kospiTopLoser} />
            <MarketMoversCard title="나스닥" marketLabel="NASDAQ" topGainer={nasdaqTopGainer} topLoser={nasdaqTopLoser} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
