import type {
  TodayMarketRawRow,
  StockRow,
  TodayMarketResponse,
  MarketCode,
  TodayMarketRawResponse,
  TrendScope,
  TrendKeywordsResponse,
  NewsMarketFilter,
  SectorListResponse,
  SectorNewsResponse,
  NewsAnalysis,
  AnalysisSource,
} from "./types";
import { API_BASE_URL, normalizePctPoints } from "./utils";

/** ===== Backend -> Front mapping ===== */
export function mapRawRowToStockRow(raw: TodayMarketRawRow, asof: string, opts?: { forceNegative?: boolean }): StockRow {
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

export async function fetchTodayMarket(
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

export async function fetchTrendKeywords(
  params: { scope: TrendScope; limit?: number; with_news?: 0 | 1 },
  signal?: AbortSignal
): Promise<TrendKeywordsResponse> {
  const qs = new URLSearchParams();
  qs.set("scope", params.scope);
  qs.set("limit", String(params.limit ?? 3));
  qs.set("with_news", String(params.with_news ?? 1));

  // ✅ 당신 코드 기준 엔드포인트 유지
  const url = `${API_BASE_URL}/api/recommend/keywords/?${qs.toString()}`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`trend_keywords fetch failed: ${res.status}`);
  return res.json();
}

/** ===== sector APIs ===== */
export async function fetchSectorList(params: { market?: NewsMarketFilter }, signal?: AbortSignal): Promise<SectorListResponse> {
  const qs = new URLSearchParams();
  if (params.market) qs.set("market", params.market);
  const url = `${API_BASE_URL}/api/news/sectors/?${qs.toString()}`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`sector_list fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchNewsBySector(
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

/**
 * ✅ 분석(툴팁/모달) API 호출
 *
 * [news]
 * - 우선: /api/news/{id}/main-summary/
 * - 실패 시: /api/news/{id}/analysis/
 *
 * [reco]
 * - /api/recommend/news/{id}/summary/  (TrendKeywordNews 분석)
 *
 * 응답 형태는 프로젝트마다 다르니 최대한 유연하게 파싱
 */
export async function fetchNewsAnalysisById(
  id: number,
  source: AnalysisSource = "news",
  signal?: AbortSignal
): Promise<NewsAnalysis> {
  if (!id || id <= 0) throw new Error("analysis: invalid id");

  // ✅ reco는 단일 엔드포인트
  if (source === "reco") {
    const url = `${API_BASE_URL}/api/recommend/news/${id}/summary/`;
    const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`reco analysis fetch failed: ${res.status}`);
    const data = await res.json();

    // 기대 형태: { success: true, analysis: {...} } 또는 { analysis: {...} }
    if (data?.analysis) return data.analysis as NewsAnalysis;

    // 혹시 분석 객체가 바로 내려오는 케이스
    if (data?.bullet_points || data?.what_is_this || data?.stock_impact) return data as NewsAnalysis;

    throw new Error("reco analysis payload shape unexpected");
  }

  // ✅ news는 기존 로직 유지 (fallback 포함)
  const tryUrls = [`${API_BASE_URL}/api/news/${id}/main-summary/`, `${API_BASE_URL}/api/news/${id}/analysis/`];

  let lastErr: any = null;

  for (const url of tryUrls) {
    try {
      const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
      if (!res.ok) {
        lastErr = new Error(`analysis fetch failed: ${res.status}`);
        continue;
      }
      const data = await res.json();

      // 형태 1) { success: true, analysis: {...} }
      if (data?.success && data?.analysis) return data.analysis as NewsAnalysis;

      // 형태 2) { analysis: {...} }
      if (data?.analysis) return data.analysis as NewsAnalysis;

      // 형태 3) 분석 객체가 바로 내려옴
      if (data?.bullet_points || data?.what_is_this || data?.stock_impact) return data as NewsAnalysis;

      lastErr = new Error("analysis payload shape unexpected");
    } catch (e: any) {
      lastErr = e;
    }
  }

  throw lastErr ?? new Error("analysis fetch failed");
}
