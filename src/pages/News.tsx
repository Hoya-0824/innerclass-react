import { useEffect, useMemo, useState } from "react";
import NewsFilterBar from "../components/News/NewsFilterBar";
import NewsCard from "../components/News/NewsCard";
import NewsDetailModal from "../components/News/NewsDetailModal";
import type { NewsItem } from "../data/newsMockData";
import api from "../lib/axios";
import LoginGateOverlay from "../components/Auth/LoginGateOverlay";

import type { BriefingExplain, Outlook } from "../components/News/NewsBriefingPanel";
import { CarouselArrowButton, SlideRail } from "../components/News/NewsCarousel";

// Weather and decoration assets
import sunnyIcon from "../assets/weathers/sunny.png";
import cloudyIcon from "../assets/weathers/cloudy.png";
import rainyIcon from "../assets/weathers/rainy.png";
import jewel1 from "../assets/weathers/jewel_1.png";
import jewel2 from "../assets/weathers/jewel_2.png";
import jewel3 from "../assets/weathers/jewel_3.png";

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

// =========================================================
// NEW: Step5 knowledge levels (title only usage near username)
// =========================================================
type KnowledgeLevel = 1 | 2 | 3 | 4 | 5;

const LEVELS: Array<{
  level: KnowledgeLevel;
  title: string;
  desc: string;
  medal: string;
}> = [
  { level: 1, title: "입문자", desc: '"금리가 올라서 주식 시장이 전체적으로 힘들어요. 당분간 조심하세요!"', medal: "🥉" },
  { level: 2, title: "초보자", desc: '"금리 인상으로 인해 시장 유동성이 줄어들고 있어요. 보수적인 접근이 필요합니다."', medal: "🥈" },
  { level: 3, title: "중급자", desc: '"기준금리 인상이 지속되면서 기술주 중심의 하락이 예상됩니다."', medal: "🥇" },
  { level: 4, title: "숙련자", desc: '"긴축 통화 정책으로 인한 밸류에이션 조정이 진행 중입니다."', medal: "💠" },
  { level: 5, title: "전문가", desc: '"FOMC의 매파적 기조로 국채 금리가 급등하며 밸류에이션 부담이 가중되었습니다."', medal: "💎" },
];

function extractKnowledgeLevel(explain: any): KnowledgeLevel | null {
  const raw =
    explain?.profile?.knowledge_level ??
    explain?.profile?.knowledgeLevel ??
    explain?.knowledge_level ??
    explain?.knowledgeLevel ??
    explain?.level ??
    null;

  const n = Number(raw);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n as KnowledgeLevel;
  return null;
}

function getLevelMeta(level: KnowledgeLevel | null) {
  if (!level) return null;
  return LEVELS.find((x) => x.level === level) ?? null;
}

function LevelBadge({
  levelMeta,
}: {
  levelMeta: { level: KnowledgeLevel; title: string; desc: string; medal: string };
}) {
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold bg-white text-gray-800 border-gray-200"
      title={`${levelMeta.medal} Lv${levelMeta.level} ${levelMeta.title}`}
    >
      <span className="text-base leading-none">{levelMeta.medal}</span>
      <span className="whitespace-nowrap">{levelMeta.title}</span>
    </span>
  );
}
// =========================================================

function normalizeSectorLabel(s: string) {
  return (s || "")
    .trim()
    .replace(/^#/, "")
    .replace(/\s+/g, " ")
    .replace(/\/+/g, "/");
}

function toMoodFromText(raw: unknown): WeatherMood {
  const t = String(raw ?? "").toLowerCase();

  if (t.includes("🌧") || t.includes("비") || t.includes("rain")) return "rainy";
  if (t.includes("☀") || t.includes("맑") || t.includes("sun")) return "sunny";
  if (t.includes("⛅") || t.includes("흐") || t.includes("cloud")) return "cloudy";

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

  return s;
}

/**
 * NEW: "보유 종목" 키워드 칩에서 투자성향(투자스타일) 문자열 제거
 * - keywords 배열에 risk_profile 값(B 등)이나 "투자성향/투자스타일"이 섞여 내려오는 경우 UI 노출 방지
 */
function stripRiskProfileFromKeywords(
  keywords: string[],
  explain: BriefingExplain | null
): string[] {
  const rp = extractRiskProfile(explain as any);
  if (!rp) return keywords;

  const normalizedRp = String(rp).trim().replace(/^#/, "");
  if (!normalizedRp) return keywords;

  return (keywords || []).filter((k) => {
    const kk = String(k ?? "").trim().replace(/^#/, "");
    if (!kk) return false;

    // 1) 완전 일치 (#B vs B 포함)
    if (kk === normalizedRp) return false;

    // 2) "투자성향 B", "투자스타일 B" 같이 문구가 섞인 케이스 제거
    const lower = kk.toLowerCase();
    const rpLower = normalizedRp.toLowerCase();

    if (lower.includes("투자성향") || lower.includes("투자스타일") || lower.includes("risk")) {
      return false;
    }

    // 3) "B형" / "B 스타일" 같은 변형도 방어적으로 제거
    if (lower === `${rpLower}형` || lower === `${rpLower} 스타일`) return false;

    return true;
  });
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
  const arr = (topKeywords as any)?.top_keywords;
  if (Array.isArray(arr) && arr.length) {
    return arr
      .map((k: any) => _normalizeChipText(k))
      .filter(Boolean)
      .slice(0, 5);
  }

  const counts = (topKeywords as any)?.counts;
  if (Array.isArray(counts) && counts.length) {
    return counts
      .map((x: any) => _normalizeChipText(x?.keyword))
      .filter(Boolean)
      .slice(0, 5);
  }

  return [];
}

const WEATHER_IMAGES: Record<WeatherMood, string> = {
  sunny: sunnyIcon,
  cloudy: cloudyIcon,
  rainy: rainyIcon,
};

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
  const ui = MOOD_UI[overallMood];
  const weatherImage = WEATHER_IMAGES[overallMood];

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left */}
      <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-5 md:p-6 shadow-sm relative overflow-hidden">
        {/* ===== Decoration layer (behind) ===== */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <img
            src={jewel2}
            alt=""
            className="absolute -top-10 md:-top-15 -right-5 md:right-10 w-32 h-32 md:w-56 md:h-56 opacity-25"
          />
          <img
            src={jewel3}
            alt=""
            className="absolute top-20 -right-4 md:-right-1 w-16 h-16 md:w-28 md:h-28 opacity-20"
          />
          <img
            src={jewel1}
            alt=""
            className="absolute top-28 right-16 md:top-25 md:right-50 w-16 h-16 md:w-30 md:h-30 opacity-22"
          />
        </div>

        {/* ===== Content layer (front) ===== */}
        <div className="relative z-10">
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-7 h-7 text-blue-500">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
                </svg>
              </span>
              <h3 className="text-base font-bold text-gray-900">AI 선정 기준 요약</h3>
            </div>
            <p className="text-sm text-gray-500">유사도 추천(임베딩) + 보유종목 부스팅</p>
          </div>

          <div className="border-3 border-blue-50 rounded-xl p-4 lg:p-7 bg-blue-50/30 relative">
            <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-3 mb-4">
              <div className="flex items-center gap-2 min-w-fit">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                  </svg>
                </span>
                <div className="text-sm font-semibold text-gray-800">유사도 추천 기준 관심사</div>
              </div>

              <div className="flex flex-wrap gap-2 pl-8 md:pl-0">
                {chips.length > 0 ? (
                  chips.map((c) => <SectorChip key={c.label} label={c.label} mood={c.mood} />)
                ) : (
                  <span className="text-sm text-gray-400">관심 섹터 정보가 없습니다.</span>
                )}

                {riskProfile ? <RiskChip text={riskProfile} /> : null}
              </div>
            </div>

            <div className="border-b border-blue-200/50 my-4" />

            <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-3">
              <div className="flex items-center gap-2 min-w-fit">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path
                      d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"
                      opacity="0"
                    />
                    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a0.5 0.5 0 0 1 0-0.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a0.5 0 0 1 0.963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a0.5 0 0 1 0 0.962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a0.5 0 0 1-0.963 0z"
                    />
                  </svg>
                </span>
                <div className="text-sm font-semibold text-gray-800">관련 키워드 TOP 5</div>
              </div>

              <div className="flex flex-wrap gap-2 pl-8 md:pl-0">
                {top5.length > 0 ? (
                  top5.map((k) => <KeywordChip key={k} label={k} />)
                ) : (
                  <span className="text-sm text-gray-400">키워드 정보가 없습니다.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="lg:w-64 bg-white border border-gray-100 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col items-center justify-center">
        <div className="text-sm font-semibold text-gray-600 mb-4">종합점수</div>

        <div className="relative w-32 h-32 mb-4">
          <img src={weatherImage} alt={ui.label} className="w-full h-full object-contain" />
        </div>

        <div className={["px-4 py-2 rounded-full border text-sm font-bold", ui.chipClass].join(" ")}>
          {ui.emoji} {ui.label}
        </div>
      </div>
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

  const [topKeywords, setTopKeywords] = useState<TopKeywordsPayload>(null);

  const [briefPage, setBriefPage] = useState(0);
  const [kwPage, setKwPage] = useState(0);

  const [briefLock, setBriefLock] = useState(false);
  const [kwLock, setKwLock] = useState(false);

  const username = localStorage.getItem("user_name");
  const displayKeywords = keywords.slice(0, 5);

  // NEW: derive current level meta from briefingExplain
  const levelMeta = useMemo(() => {
    const lv = extractKnowledgeLevel(briefingExplain as any);
    return getLevelMeta(lv);
  }, [briefingExplain]);

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

  const [pageSize, setPageSize] = useState(() => (window.innerWidth < 768 ? 3 : 6));

  useEffect(() => {
    const handleResize = () => {
      setPageSize(window.innerWidth < 768 ? 3 : 6);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const briefTotalPages = useMemo(
    () => Math.max(1, Math.ceil(aiBriefingNews.length / pageSize)),
    [aiBriefingNews.length, pageSize]
  );
  const kwTotalPages = useMemo(
    () => Math.max(1, Math.ceil(keywordNews.length / pageSize)),
    [keywordNews.length, pageSize]
  );

  const briefingSlides = useMemo(() => {
    const slides: React.ReactNode[] = [];
    const total = Math.max(1, Math.ceil(aiBriefingNews.length / pageSize));
    for (let p = 0; p < total; p++) {
      const start = p * pageSize;
      const items = aiBriefingNews.slice(start, start + pageSize);
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
  }, [aiBriefingNews, pageSize]);

  const keywordSlides = useMemo(() => {
    const slides: React.ReactNode[] = [];
    const total = Math.max(1, Math.ceil(keywordNews.length / pageSize));
    for (let p = 0; p < total; p++) {
      const start = p * pageSize;
      const items = keywordNews.slice(start, start + pageSize);
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
  }, [keywordNews, pageSize]);

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

        // NEW: strip risk profile (투자성향/투자스타일) from "보유 종목" keywords
        const currentKeywordsRaw = general.keywords || [];
        const currentKeywords = stripRiskProfileFromKeywords(
          currentKeywordsRaw,
          general.explain || null
        );
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
            {/* Title + Level badge inline */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h2 className="text-2xl font-bold text-gray-900">
                {username ? `${username}님을 위한 AI 브리핑` : "오늘의 AI 브리핑"}
              </h2>
              {levelMeta ? <LevelBadge levelMeta={levelMeta} /> : null}
            </div>

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
                <SlideRail index={briefPage} childrenSlides={briefingSlides} onSwipe={(dir) => goBrief(dir)} />

                {showBriefArrows && (
                  <>
                    <CarouselArrowButton dir="left" disabled={briefPage <= 0 || briefLock} onClick={() => goBrief("left")} />
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
              <h2 className="text-2xl font-bold text-gray-900 mb-4">보유 종목 뉴스</h2>
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
                <SlideRail index={kwPage} childrenSlides={keywordSlides} onSwipe={(dir) => goKw(dir)} />

                {showKwArrows && (
                  <>
                    <CarouselArrowButton dir="left" disabled={kwPage <= 0 || kwLock} onClick={() => goKw("left")} />
                    <CarouselArrowButton dir="right" disabled={kwPage >= kwTotalPages - 1 || kwLock} onClick={() => goKw("right")} />
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

      {selectedNews && <NewsDetailModal item={selectedNews} onClose={() => setSelectedNews(null)} />}
    </div>
  );
};

export default News;
