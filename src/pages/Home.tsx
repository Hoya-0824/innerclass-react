import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import HomeLogo from "../assets/Logo.svg";

import { ThemeNewsSelection } from "./home/components/ThemeNewsSelection";

import type { TrendTab, TrendKeywordsResponse, TodayMarketResponse } from "./home/types";
import { classNames } from "./home/utils";
import { fetchTodayMarket, fetchTrendKeywords } from "./home/api";

import { SectionTitle } from "./home/components/SectionTitle";
import { TrendNewsCard, CarouselArrowButton } from "./home/components/TrendNewsCarousel";
import { MarketMoversCard } from "./home/components/MarketMoversCard";

import NewsDetailModal_keyword from "../components/News/NewsDetailModal_keyword";
import type { NewsItem as ModalNewsItem } from "../data/newsMockData";

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

  /** Trend carousel index 기반 */
  const carouselWrapRef = useRef<HTMLDivElement | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselCanLeft, setCarouselCanLeft] = useState(false);
  const [carouselCanRight, setCarouselCanRight] = useState(false);
  const [cardW, setCardW] = useState(360);
  const gap = 16;

  /** Touch swipe support for mobile */
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50; // 최소 스와이프 거리 (px)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    const isSwipeLeft = distance > minSwipeDistance;
    const isSwipeRight = distance < -minSwipeDistance;

    if (isSwipeLeft && carouselCanRight) {
      goCarousel("right");
    } else if (isSwipeRight && carouselCanLeft) {
      goCarousel("left");
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

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

  const [selectedTrendNews, setSelectedTrendNews] = useState<ModalNewsItem | null>(null);

  const goChatbot = (text: string) => {
    const t = text.trim();
    if (!t) return;
    sessionStorage.setItem("chatbot_draft", t);
    sessionStorage.setItem("chatbot_autosend", "1");
    navigate("/chatbot");
  };

  // =========================================================
  // Feature Cards → 클릭 시 챗봇 자동 전송
  // =========================================================
  const FEATURE_CARDS = useMemo(
    () => [
      {
        label: "오늘의 뉴스 해석",
        color: "text-[#06B6D4]",
        bg: "bg-[#06B6D4]",
        prompt: "오늘 주요 경제/증시 뉴스를 3~5개로 요약하고, 초보 투자자 관점에서 핵심 포인트와 주의할 점까지 설명해줘.",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        ),
      },
      {
        label: "투자 판단 도움",
        color: "text-[#8B5CF6]",
        bg: "bg-[#8B5CF6]",
        prompt:
          "오늘 시장 흐름(코스피/코스닥/나스닥) 기준으로 초보 투자자가 체크해야 할 리스크(금리, 환율, 실적, 섹터 순환)를 정리하고, 단기/중기 관점으로 대응 전략을 제안해줘.",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        ),
      },
      {
        label: "용어 & 맥락 설명",
        color: "text-[#F59E0B]",
        bg: "bg-[#F59E0B]",
        prompt:
          "오늘 뉴스에서 자주 나오는 경제/금융 용어(예: 금리 인하, CPI, 실적 가이던스, PER/PBR, 유동성)를 초보자 수준으로 예시와 함께 쉽게 설명해줘.",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        ),
      },
      {
        label: "관심 뉴스 추천",
        color: "text-[#EC4899]",
        bg: "bg-[#EC4899]",
        prompt: "내 관심사(예: 반도체, 2차전지, AI, 환율, 금리)를 물어본 다음, 오늘 뉴스 중에서 관련 뉴스 5개를 추천하고 왜 중요한지 한 줄씩 설명해줘.",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        ),
      },
    ],
    []
  );

  // =========================================================
  // Market Sessions (OPEN/CLOSED/HOLIDAY ...) : 60초 폴링
  // =========================================================
  type MarketLabel = "KOSDAQ" | "KOSPI" | "NASDAQ";
  type MarketSessionStatus = "OPEN" | "PRE_OPEN" | "POST_CLOSE" | "CLOSED" | "HOLIDAY";

  type MarketSessionPayload = {
    status: MarketSessionStatus;
    asof: string;
    calendar_code: string;
    reason: string;
    next_open_at?: string | null;
    prev_close_at?: string | null;
  };

  type MarketSessionsResponse = {
    asof: string;
    pre_open_grace_min: number;
    post_close_grace_min: number;
    sessions: Record<MarketLabel, MarketSessionPayload>;
  };

  const [sessions, setSessions] = useState<Record<MarketLabel, MarketSessionPayload> | null>(null);
  const sessionsAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const run = async () => {
      if (sessionsAbortRef.current) sessionsAbortRef.current.abort();
      const controller = new AbortController();
      sessionsAbortRef.current = controller;

      try {
        const res = await fetch(`/api/markets/sessions/?pre_open_grace_min=5&post_close_grace_min=10&markets=KOSDAQ,KOSPI,NASDAQ`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data: MarketSessionsResponse = await res.json();
        setSessions(data.sessions);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
    };

    run();
    const t = window.setInterval(run, 60 * 1000);
    return () => {
      window.clearInterval(t);
      if (sessionsAbortRef.current) sessionsAbortRef.current.abort();
    };
  }, []);

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

  const kosdaqTopGainer = useMemo(() => dKosdaq?.top_gainers?.[0] ?? null, [dKosdaq]);
  const kosdaqTopLoser = useMemo(() => dKosdaq?.top_drawdown?.[0] ?? null, [dKosdaq]);

  const kospiTopGainer = useMemo(() => dKospi?.top_gainers?.[0] ?? null, [dKospi]);
  const kospiTopLoser = useMemo(() => dKospi?.top_drawdown?.[0] ?? null, [dKospi]);

  const nasdaqTopGainer = useMemo(() => dNasdaq?.top_gainers?.[0] ?? null, [dNasdaq]);
  const nasdaqTopLoser = useMemo(() => dNasdaq?.top_drawdown?.[0] ?? null, [dNasdaq]);

  const goCarousel = (dir: "left" | "right") => {
    const delta = dir === "left" ? -1 : 1;
    setCarouselIndex((prev) => clampCarouselIndex(prev + delta));
  };

  const translateX = useMemo(() => {
    const one = cardW + gap;
    return -(carouselIndex * one);
  }, [carouselIndex, cardW]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {selectedTrendNews && <NewsDetailModal_keyword item={selectedTrendNews} onClose={() => setSelectedTrendNews(null)} />}

        {/* 상단 채팅 입력 */}
        <div className="relative mb-8 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#E2F1FF] via-[#EEF2FF] to-[#FCE7F3] p-8 py-16 text-center ring-1 ring-black/5 sm:px-12">
          {/* Header */}
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-center">
            <div className="mb-2 flex items-center gap-2">
              <img src={HomeLogo} alt="DecodeX Logo" className="h-8 w-8 object-contain" />
              <h1 className="text-3xl font-bold tracking-tight text-[#0F172A] sm:text-4xl">
                DecodeX
              </h1>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-600 sm:text-base">
              초보 투자자를 위한 뉴스 해석 AI{"\n"}복잡한 경제 뉴스를 한눈에 이해하세요.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            {FEATURE_CARDS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => goChatbot(item.prompt)}
                className="group relative flex flex-col cursor-pointer items-start justify-between gap-3 overflow-hidden rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-black/5 transition-all hover:-translate-y-1 hover:shadow-md"
                title={item.label}
              >
                <div className={`absolute -right-4 -top-4 h-16 w-16 rounded-full blur-2xl opacity-20 ${item.bg}`} />
                <div className={`rounded-xl bg-neutral-50 p-2.5 ring-1 ring-black/5 ${item.color}`}>{item.icon}</div>
                <span className="text-sm font-semibold text-neutral-700 group-hover:text-neutral-900">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="mx-auto mt-10 lg:mt-20 max-w-2xl">
            <div className="group relative">
              <div className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-200/50 via-purple-200/50 to-pink-200/50 blur-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative flex items-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-[#216BFF]/20">
                <input
                  type="text"
                  value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      goChatbot(chatDraft);
                    }
                  }}
                  placeholder="“금리 인하 뉴스, 주식엔 어떤 영향이야?”"
                  className="h-14 w-full bg-transparent px-6 text-base text-neutral-900 outline-none placeholder:text-neutral-400"
                  data-gtm-click="main_search_bar"
                />
                <button
                  type="button"
                  onClick={() => goChatbot(chatDraft)}
                  className="mr-2 rounded-full p-2.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-[#216BFF]"
                  aria-label="search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 상태 */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="text-sm text-neutral-500">{loading ? "로딩 중..." : err ? err : ""}</div>
        </div>

        {/* 오늘의 트렌드 뉴스 */}
        <div>
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
              <div className="rounded-2xl bg-white p-4 text-sm text-neutral-600 ring-1 ring-black/5">
                표시할 트렌드 키워드가 없습니다.
              </div>
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
                    className="overflow-hidden touch-pan-y"
                    onWheel={(e) => {
                      e.preventDefault();
                    }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    <div
                      className="flex gap-4 will-change-transform"
                      style={{ transform: `translateX(${translateX}px)`, transition: "transform 220ms ease" }}
                    >
                      {activeTab.news.map((n, idx) => (
                        <div key={`${activeTab.id}:${idx}`} className="w-[320px] shrink-0 sm:w-[340px] lg:w-[360px]">
                          <TrendNewsCard item={n} onOpenModal={(modalItem) => setSelectedTrendNews(modalItem)} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white p-4 text-sm text-neutral-600 ring-1 ring-black/5">
                선택한 키워드에 대한 뉴스가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* 산업(Theme)으로 보는 뉴스 */}
        <ThemeNewsSelection />

        {/* 오늘의 증시 */}
        <div className="mt-6">
          <SectionTitle title="오늘의 증시" />
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <MarketMoversCard title="코스닥" marketLabel="KOSDAQ" topGainer={kosdaqTopGainer} topLoser={kosdaqTopLoser} sessionStatus={sessions?.KOSDAQ?.status} />
            <MarketMoversCard title="코스피" marketLabel="KOSPI" topGainer={kospiTopGainer} topLoser={kospiTopLoser} sessionStatus={sessions?.KOSPI?.status} />
            <MarketMoversCard title="나스닥" marketLabel="NASDAQ" topGainer={nasdaqTopGainer} topLoser={nasdaqTopLoser} sessionStatus={sessions?.NASDAQ?.status} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
