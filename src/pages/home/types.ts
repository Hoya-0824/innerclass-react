/** ===== Today Market API ===== */
export type MarketCode = "KOSDAQ" | "KOSPI" | "NASDAQ";

export type StockRow = {
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

export type TodayMarketResponse = {
  market: MarketCode;
  exchange?: string | null;
  asof: string;

  top_market_cap: StockRow[];
  top_gainers: StockRow[];
  top_drawdown: StockRow[];
};

/** ===== Raw Today Market API (backend 실제 응답) ===== */
export type TodayMarketRawRow = {
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

export type TodayMarketRawResponse = {
  market: MarketCode;
  asof: string;
  top_market_cap: TodayMarketRawRow[];
  top_gainers: TodayMarketRawRow[];
  top_drawdown: TodayMarketRawRow[];
};

/** ===== Trend Keywords API ===== */
export type TrendScope = "KR" | "US";

export type TrendNewsItem = {
  // ✅ reco.TrendKeywordNews PK (이제 백엔드에서 무조건 내려준다고 가정)
  id: number;

  title: string;
  summary: string;
  link: string;
  image_url: string;
  published_at: string;
  needs_image_gen?: boolean;

  related_stock_name?: string;
  related_stock_code?: string;
};

export type TrendKeywordItem = {
  keyword: string;
  reason: string;
  news?: TrendNewsItem[];
};

export type TrendKeywordsResponse = {
  scope: TrendScope;
  date: string;
  items: TrendKeywordItem[];
};

export type TrendTab = {
  id: string; // `${scope}:${keyword}:${index}`
  scope: TrendScope;
  keyword: string;
  reason: string;
  news: TrendNewsItem[];
  date: string;
};

/** ===== Sector News API ===== */
export type NewsMarketFilter = "all" | "domestic" | "international";

export type SectorItem = {
  sector: string;
  label: string;
  count: number;
};

export type SectorListResponse = {
  market: NewsMarketFilter;
  items: SectorItem[];
};

export type SectorNewsRow = {
  id: number;
  title: string;

  related_name?: string;
  ticker?: string;

  published_at: string;
  url: string;

  market: "KR" | "INTERNATIONAL" | string;

  sector: string;

  // ✅ (있으면 그대로 표시)
  analysis?: NewsAnalysis;
};

export type SectorNewsResponse = {
  sector: string;
  label: string;
  market: NewsMarketFilter;
  news: SectorNewsRow[];
};

/** ===== News Analysis (툴팁/모달에서 사용) ===== */
export type NewsAnalysis = {
  bullet_points: string[];
  what_is_this: string[];
  why_important: string[];
  stock_impact: {
    positives: string[];
    warnings: string[];
  };
  strategy_guide?: {
    short_term?: string;
    long_term?: string;
  };
  investment_action: string[];
  vocabulary: Array<{ term: string; definition: string }>;
};

/** ✅ 분석 소스 구분 (news vs reco) */
export type AnalysisSource = "news" | "reco";

/** ===== Detail modal item ===== */
export type NewsDetailItem = {
  id?: number; // optional (trend는 백엔드 id 없으면 분석 스킵 가능)
  analysisSource?: AnalysisSource; // ✅ 추가: 어떤 API를 칠지 결정

  title: string;
  summary?: string;
  imageUrl?: string;
  date?: string; // display date text
  originUrl?: string; // open original
  tags?: string[];
  marketTag?: { text: string; cls: string };
  related?: { name?: string; code?: string };
};
