export type RankingMarket = "KOSPI" | "KOSDAQ" | "NASDAQ";

/** 백엔드(today_rankings) 원본 row */
export interface RankingRow {
  rank: number;
  symbol_code: string;
  name: string;
  trade_price: number | null;
  change_rate: number | null;
  payload?: any; // include_payload=1인 경우만
}

/** 백엔드(today_rankings) 응답 */
export interface TodayRankingsRawResponse {
  market: RankingMarket;
  asof: string;
  top_market_cap: RankingRow[];
  top_gainers: RankingRow[];
  top_drawdown: RankingRow[];
}

/** Home UI에서 사용하는 형태 */
export type StockRow = {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;

  open: number | null;
  close: number | null;

  intraday_pct: number | null;
  change_pct: number | null;

  market_cap: number | null;
  volume: number | null;
  date: string;
};

export interface TodayMarketResponse {
  market: RankingMarket;
  asof: string;
  top_market_cap: StockRow[];
  top_gainers: StockRow[];
  top_drawdown: StockRow[];
}

function inferExchangeAndCurrency(market: RankingMarket): { exchange: string; currency: string } {
  if (market === "NASDAQ") return { exchange: "NASDAQ", currency: "USD" };
  // KOSPI/KOSDAQ
  return { exchange: market, currency: "KRW" };
}

function mapRankingRowToStockRow(x: RankingRow, market: RankingMarket, asof: string): StockRow {
  const { exchange, currency } = inferExchangeAndCurrency(market);

  return {
    symbol: x.symbol_code,
    name: x.name,
    exchange,
    currency,

    open: null,
    close: x.trade_price ?? null,

    intraday_pct: null,
    change_pct: x.change_rate ?? null,

    market_cap: null,
    volume: null,
    date: asof,
  };
}

export async function fetchTodayMarket(
  params: {
    market: RankingMarket;
    date?: string; // YYYY-MM-DD
    limit?: number; // default 5
    include_payload?: 0 | 1;
    apiBaseUrl?: string; // VITE_API_BASE_URL 사용하고 싶을 때
  },
  signal?: AbortSignal
): Promise<TodayMarketResponse> {
  const qs = new URLSearchParams();
  qs.set("market", params.market);
  if (params.date) qs.set("date", params.date);
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.include_payload) qs.set("include_payload", "1");

  const base = (params.apiBaseUrl ?? "").replace(/\/+$/, "");
  const url = `${base}/api/markets/today/?${qs.toString()}`;

  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`today_market fetch failed: ${res.status}`);
  }

  const raw = (await res.json()) as TodayRankingsRawResponse;

  // 방어: 백엔드가 비어있을 수 있음
  const asof = raw.asof ?? (params.date ?? "");
  const market = raw.market ?? params.market;

  return {
    market,
    asof,
    top_market_cap: (raw.top_market_cap ?? []).map((r) => mapRankingRowToStockRow(r, market, asof)),
    top_gainers: (raw.top_gainers ?? []).map((r) => mapRankingRowToStockRow(r, market, asof)),
    top_drawdown: (raw.top_drawdown ?? []).map((r) => mapRankingRowToStockRow(r, market, asof)),
  };
}
