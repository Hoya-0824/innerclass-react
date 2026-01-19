// src/pages/News.tsx
import { useEffect, useMemo, useState } from "react";
import NewsFilterBar from "../components/News/NewsFilterBar";
import NewsCard from "../components/News/NewsCard";
import NewsDetailModal from "../components/News/NewsDetailModal";
import TrendList from "../components/News/TrendList";
import { TREND_DIVIDEND, TREND_VALUE, type NewsItem } from "../data/newsMockData";
import api from "../lib/axios";
import LoginGateOverlay from "../components/Auth/LoginGateOverlay";

import type { BriefingExplain, Outlook } from "../components/News/NewsBriefingPanel";
import { CarouselArrowButton, SlideRail } from "../components/News/NewsCarousel";

type MarketFilter = "all" | "domestic" | "international";

const PAGE_SIZE = 6;
const MAX_ITEMS_AI = 100;
const MAX_ITEMS_KEYWORD = 15;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

type WeatherMood = "sunny" | "cloudy" | "rainy";

const MOOD_UI: Record<
  WeatherMood,
  { emoji: string; chipClass: string; dotClass: string; label: string }
> = {
  sunny: {
    emoji: "☀️",
    label: "맑음",
    chipClass: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
    dotClass: "bg-green-500",
  },
  cloudy: {
    emoji: "⛅️",
    label: "흐림",
    chipClass: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
    dotClass: "bg-gray-500",
  },
  rainy: {
    emoji: "🌧️",
    label: "비",
    chipClass: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    dotClass: "bg-blue-500",
  },
};

function normalizeSectorLabel(s: string) {
  return (s || "")
    .trim()
    .replace(/^#/, "")
    .replace(/\s+/g, " ")
    .replace(/\/+/g, "/");
}

function toMoodFromText(raw: unknown): WeatherMood {
  const t = String(raw ?? "").toLowerCase();

  // emoji / keywords
  if (t.includes("🌧") || t.includes("비") || t.includes("rain")) return "rainy";
  if (t.includes("☀") || t.includes("맑") || t.includes("sun")) return "sunny";
  if (t.includes("⛅") || t.includes("흐") || t.includes("cloud")) return "cloudy";

  // fallback
  return "cloudy";
}

function extractRiskProfile(explain: any): string | null {
  const v =
    explain?.risk_profile ??
    explain?.riskProfile ??
    explain?.profile?.risk_profile ??
    explain?.profile?.riskProfile ??
    explain?.user_profile?.risk_profile ??
    explain?.user?.risk_profile ??
    null;

  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;

  // e.g. "B" or "B·중립형" or "B - 중립형"
  return s;
}

function extractInterestSectors(explain: any): string[] {
  const candidates: any[] = [
    explain?.interest_sectors,
    explain?.interestSectors,
    explain?.interests,
    explain?.similarity_interests,
    explain?.similarityInterests,
    explain?.selection_basis?.interests,
    explain?.selectionBasis?.interests,
    explain?.profile?.sectors,
    explain?.user_profile?.sectors,
    explain?.user?.sectors,
  ];

  for (const c of candidates) {
    if (Array.isArray(c) && c.length) {
      return c
        .map((x) => normalizeSectorLabel(String(x)))
        .filter(Boolean)
        .slice(0, 6);
    }
  }

  // fallback: infer from keywords like "#배터리" "#IT/인터넷" "#바이오/건강"
  const kw = explain?.keywords ?? explain?.interest_keywords ?? explain?.interestKeywords;
  if (Array.isArray(kw) && kw.length) {
    const inferred = kw
      .map((x: any) => normalizeSectorLabel(String(x)))
      .filter((s: string) => s && s.length <= 20)
      .slice(0, 6);
    if (inferred.length) return inferred;
  }

  return [];
}

function buildSectorMoodMap(outlook: any): Record<string, WeatherMood> {
  const map: Record<string, WeatherMood> = {};

  // Try a few plausible shapes:
  // 1) outlook.sectors = [{ sector, mood/icon/emoji/condition }]
  // 2) outlook.sector_moods = [...]
  // 3) outlook.market?.sectors = [...]
  const arrays: any[] = [
    outlook?.sectors,
    outlook?.sector_moods,
    outlook?.sectorMoods,
    outlook?.sector_outlooks,
    outlook?.sectorOutlooks,
    outlook?.market?.sectors,
  ];

  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;

    for (const it of arr) {
      const sector =
        normalizeSectorLabel(
          it?.sector ?? it?.name ?? it?.label ?? it?.theme ?? it?.category ?? ""
        ) || "";
      if (!sector) continue;

      const moodRaw =
        it?.mood ??
        it?.weather ??
        it?.condition ??
        it?.status ??
        it?.emoji ??
        it?.icon ??
        it?.outlook ??
        "";
      map[sector] = toMoodFromText(moodRaw);
    }
  }

  return map;
}

/**
 * 종합 날씨 계산 우선순위:
 * 1) outlook에 overall/summary/market_condition 같은 값이 있으면 그걸 파싱
 * 2) 관심 섹터 칩들의 mood 다수결(동률이면 cloudy)
 */
function extractOverallMood(outlook: any, chipMoods: WeatherMood[]): WeatherMood {
  const raw =
    outlook?.overall_mood ??
    outlook?.overallMood ??
    outlook?.overall ??
    outlook?.market_mood ??
    outlook?.marketMood ??
    outlook?.market?.overall ??
    outlook?.market?.mood ??
    outlook?.summary ??
    null;

  const parsed = raw ? toMoodFromText(raw) : null;

  if (parsed) return parsed;

  if (!chipMoods.length) return "cloudy";

  const counts: Record<WeatherMood, number> = { sunny: 0, cloudy: 0, rainy: 0 };
  for (const m of chipMoods) counts[m] += 1;

  const max = Math.max(counts.sunny, counts.cloudy, counts.rainy);
  const winners = (Object.keys(counts) as WeatherMood[]).filter((k) => counts[k] === max);

  // 동률은 기본 흐림
  return winners.length === 1 ? winners[0] : "cloudy";
}

function _normalizeChipText(x: any): string {
  const s = String(x ?? "").trim();
  if (!s) return "";
  return s.startsWith("#") ? s.slice(1).trim() : s;
}

type TopKeywordsPayload =
  | {
      top_keywords?: string[];
      counts?: { keyword: string; count: number }[];
    }
  | null
  | undefined;

function extractTopKeywords(topKeywords: TopKeywordsPayload): string[] {
  // server: {"top_keywords": [...], "counts": [...], "source_articles_considered": N}
  const arr = (topKeywords as any)?.top_keywords;
  if (Array.isArray(arr) && arr.length) {
    return arr
      .map((k: any) => _normalizeChipText(k))
      .filter(Boolean)
      .slice(0, 5);
  }

  // fallback: counts 기반
  const counts = (topKeywords as any)?.counts;
  if (Array.isArray(counts) && counts.length) {
    return counts
      .map((x: any) => _normalizeChipText(x?.keyword))
      .filter(Boolean)
      .slice(0, 5);
  }

  return [];
}

function SectorChip({
  label,
  mood,
  onClick,
  active,
}: {
  label: string;
  mood: WeatherMood;
  onClick?: () => void;
  active?: boolean;
}) {
  const ui = MOOD_UI[mood];

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-sm font-medium transition-all",
        ui.chipClass,
        active ? "ring-2 ring-black/10 shadow-sm" : "",
      ].join(" ")}
      title={`${label} · ${ui.label}`}
    >
      <span className="inline-flex items-center gap-1.5">
        <span className="text-base leading-none">{ui.emoji}</span>
        <span className="truncate max-w-[140px]">{label}</span>
      </span>
      <span className={["w-1.5 h-1.5 rounded-full", ui.dotClass].join(" ")} />
    </button>
  );
}

function RiskChip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-sm font-semibold bg-orange-50 text-orange-700 border-orange-200">
      투자성향 {text}
    </span>
  );
}

function OverallWeatherBadge({ mood }: { mood: WeatherMood }) {
  const ui = MOOD_UI[mood];

  return (
    <div className="flex items-center justify-end">
      <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border bg-white shadow-sm">
        <span className="text-base leading-none">{ui.emoji}</span>
        <div className="leading-tight">
          <div className="text-[11px] font-semibold text-gray-500">종합 점수</div>
          <div className="text-sm font-bold text-gray-900">{ui.label}</div>
        </div>
        <span className={["w-1.5 h-1.5 rounded-full", ui.dotClass].join(" ")} />
      </div>
    </div>
  );
}

function KeywordChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-3 py-1.5 rounded-full border text-sm font-medium bg-white text-gray-700 border-gray-200 hover:border-gray-900 hover:text-gray-900 transition-colors">
      #{label}
    </span>
  );
}

function SelectionSummary({
  explain,
  outlook,
  topKeywords,
}: {
  explain: BriefingExplain | null;
  outlook: Outlook | null;
  topKeywords: TopKeywordsPayload;
}) {
  const interestSectors = useMemo(() => extractInterestSectors(explain as any), [explain]);
  const riskProfile = useMemo(() => extractRiskProfile(explain as any), [explain]);
  const sectorMoodMap = useMemo(() => buildSectorMoodMap(outlook as any), [outlook]);

  // If mood not found for a sector, default to "cloudy"
  const chips = useMemo(
    () =>
      interestSectors.map((s) => ({
        label: s,
        mood: sectorMoodMap[s] ?? "cloudy",
      })),
    [interestSectors, sectorMoodMap]
  );

  const overallMood = useMemo(
    () => extractOverallMood(outlook as any, chips.map((c) => c.mood)),
    [outlook, chips]
  );

  const top5 = useMemo(() => extractTopKeywords(topKeywords), [topKeywords]);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 md:p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-sm font-bold">
              AI
            </span>
            <h3 className="text-base font-bold text-gray-900">선정 기준 요약</h3>
          </div>
          <p className="text-sm text-gray-500">유사도 추천(임베딩) + 보유종목 부스팅</p>
        </div>

        {/* ✅ 오른쪽 종합 날씨 */}
        <OverallWeatherBadge mood={overallMood} />
      </div>

      <div className="mt-5">
        <div className="text-sm font-semibold text-gray-800 mb-2">유사도 추천 기준 관심사</div>
        <div className="flex flex-wrap gap-2">
          {chips.length > 0 ? (
            chips.map((c) => <SectorChip key={c.label} label={c.label} mood={c.mood} />)
          ) : (
            <span className="text-sm text-gray-400">관심 섹터 정보가 없습니다.</span>
          )}

          {riskProfile ? <RiskChip text={riskProfile} /> : null}
        </div>
      </div>

      {/* ✅ 관심사 아래: 관련 키워드 TOP 5 */}
      <div className="mt-4">
        <div className="text-sm font-semibold text-gray-800 mb-2">관련 키워드 TOP 5</div>
        <div className="flex flex-wrap gap-2">
          {top5.length > 0 ? (
            top5.map((k) => <KeywordChip key={k} label={k} />)
          ) : (
            <span className="text-sm text-gray-400">키워드 정보가 없습니다.</span>
          )}
        </div>
      </div>

      {/* 섹터별 분위기(카드/박스) 섹션은 제거: 칩으로 흡수 */}
    </div>
  );
}

const News = () => {
  const isLoggedIn = !!localStorage.getItem("access_token");

  const [aiBriefingNews, setAiBriefingNews] = useState<NewsItem[]>([]);
  const [keywordNews, setKeywordNews] = useState<NewsItem[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [marketFilter, setMarketFilter] = useState<MarketFilter>("all");

  const [isLoading, setIsLoading] = useState(false);
  const [isKeywordLoading, setIsKeywordLoading] = useState(false);

  const [briefingExplain, setBriefingExplain] = useState<BriefingExplain | null>(null);
  const [briefingOutlook, setBriefingOutlook] = useState<Outlook | null>(null);

  // ✅ server payload: top_keywords
  const [topKeywords, setTopKeywords] = useState<TopKeywordsPayload>(null);

  const [briefPage, setBriefPage] = useState(0);
  const [kwPage, setKwPage] = useState(0);

  const [briefLock, setBriefLock] = useState(false);
  const [kwLock, setKwLock] = useState(false);

  const username = localStorage.getItem("user_name");
  const displayKeywords = keywords.slice(0, 3);

  const getNewsData = async (keyword?: string, market: string = "all") => {
    const params = new URLSearchParams();
    if (keyword) params.append("keyword", keyword);
    params.append("market", market);

    const url = `/news/ai-recommend/?${params.toString()}`;
    const response = await api.get(url);

    const newsList = response.data.news || [];
    const mapped: NewsItem[] = newsList.map((item: any) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      date: item.published_at
        ? (() => {
            const d = new Date(item.published_at);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            const hh = String(d.getHours()).padStart(2, "0");
            const mi = String(d.getMinutes()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
          })()
        : "날짜 미상",
      tags: item.tags || [item.tag || "뉴스"],
      imageUrl:
        item.image_url ||
        "https://images.unsplash.com/photo-1611974765270-ca1258822981?w=800&auto=format&fit=crop",
      originUrl: item.url,
    }));

    const explain: BriefingExplain | null = response.data.explain || null;
    const outlook: Outlook | null = response.data.outlook || null;
    const top_keywords: TopKeywordsPayload = response.data.top_keywords || null;

    const sliced = keyword ? mapped.slice(0, MAX_ITEMS_KEYWORD) : mapped.slice(0, MAX_ITEMS_AI);

    return { news: sliced, keywords: response.data.keywords, explain, outlook, top_keywords };
  };

  const briefTotalPages = useMemo(
    () => Math.max(1, Math.ceil(aiBriefingNews.length / PAGE_SIZE)),
    [aiBriefingNews.length]
  );
  const kwTotalPages = useMemo(
    () => Math.max(1, Math.ceil(keywordNews.length / PAGE_SIZE)),
    [keywordNews.length]
  );

  const briefingSlides = useMemo(() => {
    const slides: React.ReactNode[] = [];
    const total = Math.max(1, Math.ceil(aiBriefingNews.length / PAGE_SIZE));
    for (let p = 0; p < total; p++) {
      const start = p * PAGE_SIZE;
      const items = aiBriefingNews.slice(start, start + PAGE_SIZE);
      slides.push(
        <div key={`brief-slide-${p}`} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div key={item.id} className="h-full">
              <NewsCard item={item} onClick={() => setSelectedNews(item)} gtmNewsType="personal" />
            </div>
          ))}
        </div>
      );
    }
    return slides;
  }, [aiBriefingNews]);

  const keywordSlides = useMemo(() => {
    const slides: React.ReactNode[] = [];
    const total = Math.max(1, Math.ceil(keywordNews.length / PAGE_SIZE));
    for (let p = 0; p < total; p++) {
      const start = p * PAGE_SIZE;
      const items = keywordNews.slice(start, start + PAGE_SIZE);
      slides.push(
        <div key={`kw-slide-${p}`} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div key={item.id} className="h-full">
              <NewsCard item={item} onClick={() => setSelectedNews(item)} gtmNewsType="personal" />
            </div>
          ))}
        </div>
      );
    }
    return slides;
  }, [keywordNews]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);

      setBriefPage(0);
      setKwPage(0);

      try {
        const general = await getNewsData(undefined, marketFilter);
        setAiBriefingNews(general.news);
        setBriefingExplain(general.explain || null);
        setBriefingOutlook(general.outlook || null);
        setTopKeywords(general.top_keywords || null);

        const currentKeywords = general.keywords || [];
        setKeywords(currentKeywords.length > 0 ? currentKeywords : []);

        let targetKw = selectedKeyword;
        const isTargetValid = targetKw && targetKw !== "#전체" && currentKeywords.includes(targetKw);

        if (!isTargetValid && currentKeywords.length > 0) {
          targetKw = currentKeywords[0];
        }

        if (targetKw) {
          setSelectedKeyword(targetKw);
          setIsKeywordLoading(true);

          const kwData = await getNewsData(targetKw.replace("#", ""), marketFilter);
          setKeywordNews(kwData.news);

          setIsKeywordLoading(false);
        } else {
          setSelectedKeyword(null);
          setKeywordNews([]);
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketFilter]);

  useEffect(() => {
    setBriefPage((p) => clamp(p, 0, briefTotalPages - 1));
  }, [briefTotalPages]);

  useEffect(() => {
    setKwPage((p) => clamp(p, 0, kwTotalPages - 1));
  }, [kwTotalPages]);

  const handleMarketFilterChange = (filter: MarketFilter) => {
    setMarketFilter(filter);
  };

  const handleKeywordClick = async (keyword: string) => {
    if (keyword === selectedKeyword) return;

    setSelectedKeyword(keyword);
    setIsKeywordLoading(true);
    setKwPage(0);

    try {
      const clean = keyword.replace("#", "");
      const data = await getNewsData(clean, marketFilter);
      setKeywordNews(data.news);
    } catch {
      // ignore
    } finally {
      setIsKeywordLoading(false);
    }
  };

  const goBrief = (dir: "left" | "right") => {
    if (briefLock) return;

    const next = dir === "left" ? briefPage - 1 : briefPage + 1;
    if (next < 0 || next > briefTotalPages - 1) return;

    setBriefLock(true);
    setBriefPage(next);
    window.setTimeout(() => setBriefLock(false), 260);
  };

  const goKw = (dir: "left" | "right") => {
    if (kwLock) return;

    const next = dir === "left" ? kwPage - 1 : kwPage + 1;
    if (next < 0 || next > kwTotalPages - 1) return;

    setKwLock(true);
    setKwPage(next);
    window.setTimeout(() => setKwLock(false), 260);
  };

  const showBriefArrows = aiBriefingNews.length > PAGE_SIZE;
  const showKwArrows = keywordNews.length > PAGE_SIZE;

  return (
    <div className="max-w-[1240px] px-4 md:px-6 mx-auto mt-6 md:mt-12 pb-20">
      <NewsFilterBar activeFilter={marketFilter} onFilterChange={handleMarketFilterChange} />

      <div className="relative">
        <section className="mb-16">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {username ? `${username}님을 위한 AI 브리핑` : "오늘의 AI 브리핑"}
            </h2>

            {/* 선정 기준 요약 + 종합 날씨 + 관련 키워드 TOP5 */}
            <SelectionSummary
              explain={briefingExplain}
              outlook={briefingOutlook}
              topKeywords={topKeywords}
            />
          </div>

          <div className="relative">
            {isLoading ? (
              <div className="text-center py-10 text-gray-400">AI 브리핑을 불러오는 중입니다...</div>
            ) : aiBriefingNews.length > 0 ? (
              <div className="relative">
                <SlideRail index={briefPage} childrenSlides={briefingSlides} />

                {showBriefArrows && (
                  <>
                    <CarouselArrowButton
                      dir="left"
                      disabled={briefPage <= 0 || briefLock}
                      onClick={() => goBrief("left")}
                    />
                    <CarouselArrowButton
                      dir="right"
                      disabled={briefPage >= briefTotalPages - 1 || briefLock}
                      onClick={() => goBrief("right")}
                    />
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400">
                {marketFilter === "international" ? "해외 뉴스가 없습니다." : "추천 뉴스가 없습니다."}
              </div>
            )}
          </div>
        </section>

        <section className="mb-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">내 키워드 뉴스</h2>
              <div className="flex flex-wrap gap-2">
                {displayKeywords.map((keyword, idx) => (
                  <span
                    key={idx}
                    onClick={() => handleKeywordClick(keyword)}
                    className={`px-4 py-2 border rounded-full text-sm font-medium transition-all cursor-pointer ${
                      selectedKeyword === keyword
                        ? "bg-gray-900 border-gray-900 text-white shadow-md transform scale-105"
                        : "bg-white border-gray-300 text-gray-700 hover:border-gray-900 hover:text-black hover:shadow-sm"
                    }`}
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="relative">
            {isKeywordLoading ? (
              <div className="text-center py-10 text-gray-400">키워드 뉴스를 불러오는 중입니다...</div>
            ) : keywordNews.length > 0 ? (
              <div className="relative">
                <SlideRail index={kwPage} childrenSlides={keywordSlides} />

                {showKwArrows && (
                  <>
                    <CarouselArrowButton
                      dir="left"
                      disabled={kwPage <= 0 || kwLock}
                      onClick={() => goKw("left")}
                    />
                    <CarouselArrowButton
                      dir="right"
                      disabled={kwPage >= kwTotalPages - 1 || kwLock}
                      onClick={() => goKw("right")}
                    />
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400">해당 키워드의 뉴스가 없습니다.</div>
            )}
          </div>
        </section>

        {!isLoggedIn && <LoginGateOverlay />}
      </div>

      <section className="mb-16">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 inline-block mr-3">오늘의 트렌드 뉴스</h2>
          <p className="inline-block text-gray-500 text-sm mt-1">지금 시장에 영향을 준 뉴스만 골랐어요</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl p-2 bg-yellow-50 rounded-lg">💰</span>
              <h3 className="text-lg font-bold text-gray-900">꾸준한 배당을 주는 주식</h3>
            </div>
            <TrendList items={TREND_DIVIDEND} />
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl p-2 bg-blue-50 rounded-lg">📉</span>
              <h3 className="text-lg font-bold text-gray-900">아직 저렴한 가치주</h3>
            </div>
            <TrendList items={TREND_VALUE} />
          </div>
        </div>
      </section>

      {selectedNews && <NewsDetailModal item={selectedNews} onClose={() => setSelectedNews(null)} />}
    </div>
  );
};

export default News;
