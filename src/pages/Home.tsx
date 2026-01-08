// src/pages/Home.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/axios";

/** ===== News.tsx 방식(/news/ai-recommend/)으로 "대충 긁어오기" ===== */
type TopScope = "ALL" | "KR" | "US";
type NewsMarketFilter = "all" | "domestic" | "international";

function scopeToMarketFilter(scope: TopScope): NewsMarketFilter {
  if (scope === "KR") return "domestic";
  if (scope === "US") return "international";
  return "all";
}

async function fetchAiRecommendNews(params: { market: NewsMarketFilter; keyword?: string }) {
  // News.tsx의 트릭: all 선택해도 domestic으로 호출
  const apiMarket = params.market === "all" ? "domestic" : params.market;

  const qs = new URLSearchParams();
  if (params.keyword) qs.append("keyword", params.keyword);
  qs.append("market", apiMarket);

  const url = `/news/ai-recommend/?${qs.toString()}`;
  const res = await api.get(url);

  const list = (res.data?.news ?? []) as any[];
  const keywords = (res.data?.keywords ?? []) as string[];
  return { list, keywords };
}

type TrendNewsItem = {
  title: string;
  url: string;
  image_url?: string | null;
  description?: string | null;
  published_at?: string | null;
  market?: "KR" | "US";
};

type AiNewsItem = {
  title: string;
  url: string;
  image_url?: string | null;
  description?: string | null;
  related_symbols?: string[];
  published_at?: string | null;
};

function mapToTrendItems(rawList: any[], scope: TopScope): TrendNewsItem[] {
  return (rawList ?? []).slice(0, 3).map((item: any) => ({
    title: item.title ?? "",
    url: item.url ?? item.link ?? "#",
    image_url: item.image_url ?? item.imageUrl ?? null,
    description: item.summary ?? item.description ?? null,
    published_at: item.published_at ?? item.publishedAt ?? null,
    market: scope === "KR" ? "KR" : scope === "US" ? "US" : (item.market ?? undefined),
  }));
}

function mapToAiItems(rawList: any[]): AiNewsItem[] {
  return (rawList ?? []).slice(0, 3).map((item: any) => ({
    title: item.title ?? "",
    url: item.url ?? item.link ?? "#",
    image_url: item.image_url ?? item.imageUrl ?? null,
    description: item.summary ?? item.description ?? null,
    related_symbols: item.related_symbols ?? item.relatedSymbols ?? [],
    published_at: item.published_at ?? item.publishedAt ?? null,
  }));
}

/** ===== Theme Picks ===== */
type ThemePick = {
  theme: string;
  symbol: string;
  name: string;
  reason?: string | null;
};
type ThemePicksResponse = {
  scope: TopScope;
  date?: string;
  items: ThemePick[];
};

/** ===== Today Market API (백엔드 today_market 기준) ===== */
type MarketCode = "KR" | "US";
type ExchangeCode = "KOSDAQ" | "KOSPI" | "NASDAQ";

type StockRow = {
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

type TodayMarketResponse = {
  market: MarketCode;
  exchange?: string | null;
  asof: string;

  top_market_cap: StockRow[];
  top_gainers: StockRow[];  // ✅ 백엔드 패치 필요
  top_drawdown: StockRow[];
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function formatInt(x: number | null | undefined): string {
  if (x === null || x === undefined || Number.isNaN(x)) return "-";
  return Math.trunc(x).toLocaleString("ko-KR");
}

function formatPct(x: number | null | undefined): string {
  if (x === null || x === undefined || Number.isNaN(x)) return "-";
  const v = Math.trunc(x);
  if (v > 0) return `+${v}%`;
  if (v < 0) return `${v}%`;
  return "0%";
}

function pctColorClass(x: number | null | undefined): string {
  if (x === null || x === undefined || Number.isNaN(x)) return "text-neutral-500";
  const v = Math.trunc(x);
  if (v > 0) return "text-rose-600";
  if (v < 0) return "text-blue-600";
  return "text-neutral-600";
}

function getAccessToken(): string | null {
  return localStorage.getItem("access_token");
}

function formatNewsTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/**
 * News.tsx와 동일하게 이미지 URL을 직접 반환합니다.
 * 이미지가 없는 경우 undefined를 반환하여 placeholder를 표시합니다.
 */
function newsImageSrc(imageUrl?: string | null): string | undefined {
  return imageUrl ?? undefined;
}

async function fetchThemePicksRaw(scope: TopScope, signal?: AbortSignal): Promise<ThemePicksResponse> {
  const url = `${API_BASE_URL}/api/recommend/themes/?scope=${scope}&limit=3`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`theme picks fetch failed: ${res.status}`);
  return res.json();
}

async function fetchTodayMarket(params: { market: MarketCode; exchange?: ExchangeCode; date?: string }, signal?: AbortSignal): Promise<TodayMarketResponse> {
  const qs = new URLSearchParams();
  qs.set("market", params.market);
  if (params.exchange) qs.set("exchange", params.exchange);
  if (params.date) qs.set("date", params.date);

  const url = `${API_BASE_URL}/api/markets/today/?${qs.toString()}`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`today_market fetch failed: ${res.status}`);
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

function MarketScopeToggle({
  scope,
  onChange,
}: {
  scope: TopScope;
  onChange: (s: TopScope) => void;
}) {
  const ScopeBtn = ({
    active,
    label,
    onClick,
  }: {
    active: boolean;
    label: string;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "rounded-lg px-3 py-1.5 text-sm font-medium transition inline-flex items-center gap-2",
        active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"
      )}
    >
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex items-center gap-2 rounded-xl bg-white p-1 shadow-sm ring-1 ring-black/5">
      <ScopeBtn active={scope === "ALL"} onClick={() => onChange("ALL")} label="전체" />
      <ScopeBtn active={scope === "KR"} onClick={() => onChange("KR")} label="국내" />
      <ScopeBtn active={scope === "US"} onClick={() => onChange("US")} label="해외" />
    </div>
  );
}

function TrendNewsCard({ n }: { n: TrendNewsItem }) {
  return (
    <a
      href={n.url}
      target="_blank"
      rel="noreferrer"
      className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 hover:ring-black/10"
    >
      <div className="relative aspect-[16/9] bg-neutral-100">
        {n.image_url ? (
          <img src={n.image_url} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" loading="lazy" />
        ) : (
          <div className="h-full w-full bg-neutral-100" />
        )}

        {n.market ? (
          <div className="absolute left-2 top-2">
            <span className="rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-neutral-800 ring-1 ring-black/5">
              {n.market === "KR" ? "국내" : "해외"}
            </span>
          </div>
        ) : null}
      </div>

      <div className="p-3">
        <div className="line-clamp-2 text-sm font-semibold text-neutral-900 group-hover:underline">{n.title}</div>
        <div className="mt-2 line-clamp-2 text-xs text-neutral-600">{n.description ?? "요약 준비중"}</div>
        {n.published_at ? <div className="mt-2 text-xs text-neutral-400">{formatNewsTime(n.published_at)}</div> : null}
      </div>
    </a>
  );
}

function ThemePickCard({ p }: { p: ThemePick }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="text-xs font-semibold text-neutral-500">테마</div>
      <div className="mt-1 text-base font-semibold text-neutral-900">{p.theme}</div>

      <div className="mt-3 rounded-xl bg-neutral-50 p-3 ring-1 ring-black/5">
        <div className="text-sm font-semibold text-neutral-900">{p.name}</div>
        <div className="mt-0.5 text-xs text-neutral-500">{p.symbol}</div>
        {p.reason ? <div className="mt-2 text-xs text-neutral-600 line-clamp-3">{p.reason}</div> : null}
      </div>
    </div>
  );
}

function AiNewsRow({ n }: { n: AiNewsItem }) {
  return (
    <a
      href={n.url}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 hover:ring-black/10"
    >
      <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-black/5">
        {n.image_url ? (
          <img src={n.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full bg-neutral-100" />
        )}
      </div>

      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-neutral-900 group-hover:underline">{n.title}</div>
        <div className="mt-1 line-clamp-2 text-xs text-neutral-600">{n.description ?? "요약 준비중"}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-neutral-400">
          {n.published_at ? <span>{formatNewsTime(n.published_at)}</span> : null}
          {n.related_symbols && n.related_symbols.length ? <span className="truncate">· {n.related_symbols.slice(0, 3).join(", ")}</span> : null}
        </div>
      </div>
    </a>
  );
}

/** ===== 오늘의 증시: 급상승 1개 / 급하락 1개 ===== */
function SingleMoverRow({ row }: { row: StockRow }) {
  const price = row.close ?? null;
  const pct = row.intraday_pct ?? row.change_pct ?? null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 ring-1 ring-black/5">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-neutral-900">{row.name}</div>
        <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
          <span className="truncate">{row.symbol}</span>
          <span className="text-neutral-300">•</span>
          <span className="font-semibold text-neutral-800">{formatInt(price)}</span>
        </div>
      </div>

      <div className={classNames("shrink-0 text-sm font-semibold", pctColorClass(pct))}>{formatPct(pct)}</div>
    </div>
  );
}

function MarketMoversCard({
  title,
  marketLabel,
  asof,
  topGainer,
  topLoser,
}: {
  title: string;
  marketLabel: string;
  asof?: string;
  topGainer: StockRow | null;
  topLoser: StockRow | null;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="mb-3">
        <div className="text-sm font-semibold text-neutral-900">{title}</div>
        <div className="mt-0.5 text-xs text-neutral-500">
          {marketLabel}
          {asof ? ` · 기준일: ${asof}` : ""}
        </div>
      </div>

      <div className="rounded-2xl bg-neutral-50 p-3 ring-1 ring-black/5">
        <div className="grid grid-cols-1 gap-3">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold text-neutral-600">급상승 1위</div>
            </div>
            {topGainer ? (
              <SingleMoverRow row={topGainer} />
            ) : (
              <div className="rounded-xl bg-white p-3 text-sm text-neutral-500 ring-1 ring-black/5">데이터가 없습니다.</div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold text-neutral-600">급하락 1위</div>
            </div>
            {topLoser ? (
              <SingleMoverRow row={topLoser} />
            ) : (
              <div className="rounded-xl bg-white p-3 text-sm text-neutral-500 ring-1 ring-black/5">데이터가 없습니다.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const Home = () => {
  const navigate = useNavigate();
  const [scope, setScope] = useState<TopScope>("ALL");

  // today_market data (exchange별)
  const [dKosdaq, setDKosdaq] = useState<TodayMarketResponse | null>(null);
  const [dKospi, setDKospi] = useState<TodayMarketResponse | null>(null);
  const [dNasdaq, setDNasdaq] = useState<TodayMarketResponse | null>(null);

  const [chatDraft, setChatDraft] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const controllerRef = useRef<AbortController | null>(null);
  const runSeqRef = useRef<number>(0);

  /** ===== Trend News (3) ===== */
  const [trendNews, setTrendNews] = useState<TrendNewsItem[]>([]);
  const [trendErr, setTrendErr] = useState("");

  /** ===== Theme picks (3) ===== */
  const [themePicks, setThemePicks] = useState<ThemePick[]>([]);
  const [themeErr, setThemeErr] = useState("");
  const [themeDate, setThemeDate] = useState<string>("");

  /** ===== AI stock news (3) ===== */
  const [aiNews, setAiNews] = useState<AiNewsItem[]>([]);
  const [aiNewsErr, setAiNewsErr] = useState("");

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
        if (scope === "ALL") {
          const [a, b, c] = await Promise.all([
            fetchTodayMarket({ market: "KR", exchange: "KOSDAQ" }, controller.signal),
            fetchTodayMarket({ market: "KR", exchange: "KOSPI" }, controller.signal),
            fetchTodayMarket({ market: "US", exchange: "NASDAQ" }, controller.signal),
          ]);
          if (mySeq !== runSeqRef.current) return;
          setDKosdaq(a);
          setDKospi(b);
          setDNasdaq(c);
        } else if (scope === "KR") {
          const [a, b] = await Promise.all([
            fetchTodayMarket({ market: "KR", exchange: "KOSDAQ" }, controller.signal),
            fetchTodayMarket({ market: "KR", exchange: "KOSPI" }, controller.signal),
          ]);
          if (mySeq !== runSeqRef.current) return;
          setDKosdaq(a);
          setDKospi(b);
          setDNasdaq(null);
        } else {
          const c = await fetchTodayMarket({ market: "US", exchange: "NASDAQ" }, controller.signal);
          if (mySeq !== runSeqRef.current) return;
          setDNasdaq(c);
          setDKosdaq(null);
          setDKospi(null);
        }
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
  }, [scope]);

  // trend news (5분)
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        setTrendErr("");
        const market = scopeToMarketFilter(scope);
        const { list } = await fetchAiRecommendNews({ market });
        setTrendNews(mapToTrendItems(list, scope));
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setTrendNews([]);
        setTrendErr(e?.message ?? "트렌드 뉴스를 불러오지 못했습니다.");
      }
    };
    run();
    const t = window.setInterval(run, 5 * 60 * 1000);
    return () => {
      controller.abort();
      window.clearInterval(t);
    };
  }, [scope]);

  // theme picks (5분)
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        setThemeErr("");
        const data = await fetchThemePicksRaw(scope, controller.signal);
        setThemeDate(data.date ?? "");
        setThemePicks((data.items ?? []).slice(0, 3));
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setThemePicks([]);
        setThemeDate("");
        setThemeErr(e?.message ?? "테마 추천을 불러오지 못했습니다.");
      }
    };
    run();
    const t = window.setInterval(run, 5 * 60 * 1000);
    return () => {
      controller.abort();
      window.clearInterval(t);
    };
  }, [scope]);

  // AI stock news (5분)
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        setAiNewsErr("");
        const market = scopeToMarketFilter(scope);
        const general = await fetchAiRecommendNews({ market });
        const firstKw = (general.keywords ?? [])[0];
        if (!firstKw) {
          setAiNews([]);
          return;
        }
        const cleanKeyword = String(firstKw).replace(/^#/, "");
        const { list } = await fetchAiRecommendNews({ market, keyword: cleanKeyword });
        setAiNews(mapToAiItems(list));
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setAiNews([]);
        setAiNewsErr(e?.message ?? "AI 추천 뉴스를 불러오지 못했습니다.");
      }
    };
    run();
    const t = window.setInterval(run, 5 * 60 * 1000);
    return () => {
      controller.abort();
      window.clearInterval(t);
    };
  }, [scope]);

  const asofText = useMemo(() => {
    const ds = [dKosdaq?.asof, dKospi?.asof, dNasdaq?.asof].filter(Boolean) as string[];
    if (!ds.length) return "";
    // 동일 날짜를 기대하지만, 혹시 다르면 가장 최근값을 표시
    const latest = ds.slice().sort().reverse()[0];
    return latest ? `기준일: ${latest}` : "";
  }, [dKosdaq, dKospi, dNasdaq]);

  const kosdaqTopGainer = useMemo(() => dKosdaq?.top_gainers?.[0] ?? null, [dKosdaq]);
  const kosdaqTopLoser = useMemo(() => dKosdaq?.top_drawdown?.[0] ?? null, [dKosdaq]);

  const kospiTopGainer = useMemo(() => dKospi?.top_gainers?.[0] ?? null, [dKospi]);
  const kospiTopLoser = useMemo(() => dKospi?.top_drawdown?.[0] ?? null, [dKospi]);

  const nasdaqTopGainer = useMemo(() => dNasdaq?.top_gainers?.[0] ?? null, [dNasdaq]);
  const nasdaqTopLoser = useMemo(() => dNasdaq?.top_drawdown?.[0] ?? null, [dNasdaq]);

  return (
    <div className="min-h-screen bg-[#f6f7f9]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* ===== 0) 상단: 채팅 입력 (가로 전체) ===== */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="inline-flex items-center rounded-full bg-[#216BFF]/10 px-3 py-1 text-xs font-semibold text-[#216BFF]">
                AI에게 물어보세요
              </div>
            </div>

            {/* input group */}
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

            {/* quick chips */}
            <div className="flex flex-wrap gap-2">
              {["내 관심종목 뉴스 요약해줘", "오늘 시장 분위기 3줄 요약", "나스닥 프리마켓 급등 이유?", "급등주 리스크 체크리스트"].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => goChatbot(q)}
                  className="rounded-full bg-white px-3 py-2 text-sm font-medium text-neutral-700 ring-1 ring-black/5 hover:bg-[#216BFF]/5 hover:text-neutral-900"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ===== 1) 토글/기준일/상태 ===== */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <MarketScopeToggle scope={scope} onChange={setScope} />
          <div className="text-sm text-neutral-500">{asofText}</div>
          <div className="text-sm text-neutral-500">{loading ? "로딩 중..." : err ? err : ""}</div>
        </div>

        {/* ===== 2) 오늘의 트렌드 뉴스 (3개) ===== */}
        <div className="mt-6">
          <SectionTitle
            title="오늘의 트렌드 뉴스"
            right={
              <a
                href="https://finance.naver.com/news/"
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-neutral-500 hover:text-neutral-800"
              >
                더보기
              </a>
            }
          />

          <div className="mt-3">
            {trendErr ? (
              <div className="rounded-2xl bg-white p-4 text-sm text-neutral-600 ring-1 ring-black/5">{trendErr}</div>
            ) : trendNews.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center text-sm text-neutral-500 ring-1 ring-black/5">트렌드 뉴스가 없습니다.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {trendNews.slice(0, 3).map((n, idx) => (
                  <TrendNewsCard key={`${n.url}-${idx}`} n={n} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== 3) 테마 기반 추천 종목 (3개) ===== */}
        <div className="mt-6">
          <SectionTitle title="오늘의 테마 추천" right={themeDate ? <div className="text-sm text-neutral-500">기준일: {themeDate}</div> : undefined} />
          <div className="mt-3">
            {themeErr ? (
              <div className="rounded-2xl bg-white p-4 text-sm text-neutral-600 ring-1 ring-black/5">{themeErr}</div>
            ) : themePicks.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center text-sm text-neutral-500 ring-1 ring-black/5">
                추천 데이터 준비중 (오늘자 테마를 아직 생성하지 않았습니다)
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {themePicks.slice(0, 3).map((p, idx) => (
                  <ThemePickCard key={`${p.theme}-${p.symbol}-${idx}`} p={p} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== 4) AI 추천 종목 기반 뉴스 (3개) ===== */}
        <div className="mt-6">
          <SectionTitle title="AI가 추천한 종목 기반 뉴스" />
          <div className="mt-3">
            {aiNewsErr ? (
              <div className="rounded-2xl bg-white p-4 text-sm text-neutral-600 ring-1 ring-black/5">{aiNewsErr}</div>
            ) : aiNews.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center text-sm text-neutral-500 ring-1 ring-black/5">
                추천 뉴스 준비중 (백엔드 엔드포인트 연결 필요)
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {aiNews.slice(0, 3).map((n, idx) => (
                  <AiNewsRow key={`${n.url}-${idx}`} n={n} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== 5) 오늘의 증시: 급상승 1개 / 급하락 1개 ===== */}
        <div className="mt-6">
          <SectionTitle title="오늘의 증시" />
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <MarketMoversCard
              title="코스닥"
              marketLabel="KOSDAQ"
              asof={dKosdaq?.asof}
              topGainer={kosdaqTopGainer}
              topLoser={kosdaqTopLoser}
            />
            <MarketMoversCard
              title="코스피"
              marketLabel="KOSPI"
              asof={dKospi?.asof}
              topGainer={kospiTopGainer}
              topLoser={kospiTopLoser}
            />
            <MarketMoversCard
              title="나스닥"
              marketLabel="NASDAQ"
              asof={dNasdaq?.asof}
              topGainer={nasdaqTopGainer}
              topLoser={nasdaqTopLoser}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
