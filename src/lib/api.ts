export type Market = "KR" | "US";

export interface StockItem {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  open: number | null;
  close: number | null;
  intraday_pct: number | null;
  market_cap: number | null;
}

export interface TodayMarketResponse {
  market: Market;
  asof: string;
  top_market_cap: StockItem[];
  top_drawdown: StockItem[];
}

export async function fetchTodayMarket(
  market: Market
): Promise<TodayMarketResponse> {
  const res = await fetch(`/api/markets/today/?market=${market}`);
  if (!res.ok) {
    throw new Error("Failed to fetch market data");
  }
  return res.json();
}

