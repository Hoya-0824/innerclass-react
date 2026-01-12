import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { TrendTab, TrendKeywordsResponse, SectorItem, TodayMarketResponse, SectorNewsRow, NewsDetailItem } from "./home/types";
import { getAccessToken, classNames } from "./home/utils";
import { fetchTodayMarket, fetchTrendKeywords, fetchSectorList, fetchNewsBySector } from "./home/api";

import { SectionTitle } from "./home/components/SectionTitle";
import { NewsInsightModal } from "./home/components/NewsInsightModal";
import { TrendNewsCard, CarouselArrowButton } from "./home/components/TrendNewsCarousel";
import { SectorLeftItem, SectorScrollButton, SectorNewsRowItem } from "./home/components/SectorNews";
import { MarketMoversCard } from "./home/components/MarketMoversCard";

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

  /** ✅ 뉴스 분석 모달 */
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<NewsDetailItem | null>(null);

  const openDetail = (it: NewsDetailItem) => {
    setDetailItem(it);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailItem(null);
  };

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

  const updateSectorItemsScrollState = () => updateScrollState(sectorItemsRef.current, setCanSectorItemsUp, setCanSectorItemsDown);

  const updateSectorNewsScrollState = () => updateScrollState(sectorNewsListRef.current, setCanSectorUp, setCanSectorDown);

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

  // =========================================================
  // ✅ Market Sessions (OPEN/CLOSED/HOLIDAY ...) : 60초 폴링
  //   - MarketMoversCard의 marketLabel 옆에 배지 표시용
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
    const rowH = 44;
    const gapH = 4; // space-y-1
    return visible * rowH + Math.max(0, visible - 1) * gapH;
  }, [sectorItems.length]);

  return (
    <div className="min-h-screen bg-[#f6f7f9]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* ✅ 뉴스 분석 모달 */}
        <NewsInsightModal open={detailOpen} item={detailItem} onClose={closeDetail} />

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
                    <div className="flex gap-4 will-change-transform" style={{ transform: `translateX(${translateX}px)`, transition: "transform 220ms ease" }}>
                      {activeTab.news.map((n, idx) => (
                        <div key={`${activeTab.id}:${idx}`} className="shrink-0 w-[320px] sm:w-[340px] lg:w-[360px]">
                          <TrendNewsCard item={n} onOpen={openDetail} />
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
                      <SectorScrollButton dir="down" disabled={!canSectorItemsDown} onClick={() => scrollListBy(sectorItemsRef.current, "down")} />
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
                          height: sectorListHeightPx,
                          maxHeight: 220,
                        }}
                      >
                        {sectorItems.map((s) => (
                          <SectorLeftItem key={s.sector} active={s.sector === activeSector} label={s.label} onClick={() => setActiveSector(s.sector)} />
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
                      <SectorScrollButton dir="down" disabled={!canSectorDown} onClick={() => scrollListBy(sectorNewsListRef.current, "down")} />
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
                      <div ref={sectorNewsListRef} className={classNames("mt-1 overflow-y-auto pr-1", "h-[210px] sm:h-[230px] lg:h-[240px]")}>
                        {sectorNews.slice(0, 30).map((row) => (
                          <SectorNewsRowItem key={row.id} row={row} onOpen={openDetail} />
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
            <MarketMoversCard
              title="코스닥"
              marketLabel="KOSDAQ"
              topGainer={kosdaqTopGainer}
              topLoser={kosdaqTopLoser}
              sessionStatus={sessions?.KOSDAQ?.status}
            />
            <MarketMoversCard
              title="코스피"
              marketLabel="KOSPI"
              topGainer={kospiTopGainer}
              topLoser={kospiTopLoser}
              sessionStatus={sessions?.KOSPI?.status}
            />
            <MarketMoversCard
              title="나스닥"
              marketLabel="NASDAQ"
              topGainer={nasdaqTopGainer}
              topLoser={nasdaqTopLoser}
              sessionStatus={sessions?.NASDAQ?.status}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
