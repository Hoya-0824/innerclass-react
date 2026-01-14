// src/pages/home/components/ThemeNewsSelection.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { classNames, getHost, getApiBase } from "../utils";

// ✅ NewsDetailModal을 "그대로" 재사용
import NewsDetailModal from "../../../components/News/NewsDetailModal";
import type { NewsItem as ModalNewsItem } from "../../../data/newsMockData";

type ThemeItem = {
  key: string;
  label: string;
};

type ThemeNewsItem = {
  id: number;
  title: string;
  summary: string;
  url: string;
  image_url?: string | null;
  published_at: string;
  market: "Korea" | "International";
  market_tag: "국내" | "해외";
  theme: string;
  tags: string[];
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

function MarketPill({ value }: { value: "국내" | "해외" }) {
  const cls =
    value === "국내"
      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
      : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-none",
        cls
      )}
    >
      {value}
    </span>
  );
}

function TagPill({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] leading-none text-neutral-700">
      {text}
    </span>
  );
}

const THEME_FALLBACK_LABELS: Record<string, { ko: string; en: string }> = {
  SEMICONDUCTOR_AI: { ko: "반도체/AI", en: "Semiconductor/AI" },
  BATTERY: { ko: "배터리", en: "Battery" },
  ICT_PLATFORM: { ko: "IT/인터넷", en: "ICT Platform" },
  BIO_HEALTH: { ko: "바이오/건강", en: "Bio/Health" },
  AUTO: { ko: "자동차", en: "Automobile" },
  ETC: { ko: "기타", en: "ETC" },
  GREEN_ENERGY: { ko: "친환경 에너지", en: "Green Energy" },
  FINANCE_HOLDING: { ko: "금융/지주", en: "Finance/Holding" },
};

function hasHangul(s: string) {
  return /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(s);
}

function prettifyKey(key: string) {
  return key
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getThemeTexts(t: ThemeItem): { ko: string; en: string } {
  const mapped = THEME_FALLBACK_LABELS[t.key];
  if (mapped) return mapped;

  const label = (t.label || "").trim();
  if (label) {
    if (hasHangul(label)) return { ko: label, en: prettifyKey(t.key) };
    return { ko: prettifyKey(t.key), en: label };
  }

  return { ko: prettifyKey(t.key), en: prettifyKey(t.key) };
}

function formatKSTCompact(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** ===== 엔드포인트 ===== */
const THEME_LIST_ENDPOINT = "/news/themes/";
const THEME_NEWS_ENDPOINT = "/news/by-theme/";

function toModalNewsItem(n: ThemeNewsItem): ModalNewsItem {
  // ✅ NewsDetailModal이 기대하는 필드명: imageUrl, originUrl, date, tags ...
  return {
    id: n.id,
    title: n.title,
    summary: n.summary,
    date: n.published_at
      ? (() => {
          const d = new Date(n.published_at);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          const hours = String(d.getHours()).padStart(2, "0");
          const minutes = String(d.getMinutes()).padStart(2, "0");
          return `${year}-${month}-${day} ${hours}:${minutes}`;
        })()
      : "날짜 미상",
    tags: (n.tags && n.tags.length ? n.tags : []).slice(0),
    imageUrl:
      n.image_url ||
      "https://images.unsplash.com/photo-1611974765270-ca1258822981?w=800&auto=format&fit=crop",
    originUrl: n.url,
  } as ModalNewsItem;
}

export function ThemeNewsSelection() {
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string>("SEMICONDUCTOR_AI");

  const [news, setNews] = useState<ThemeNewsItem[]>([]);
  const [loadingThemes, setLoadingThemes] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);

  const [themeError, setThemeError] = useState<string | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);

  // ✅ 모달 상태 추가
  const [selectedNews, setSelectedNews] = useState<ModalNewsItem | null>(null);

  /**
   * 좌/우 스크롤 패널 높이 동일
   */
  const VISIBLE_COUNT = 4;
  const THEME_CARD_H = 56; // h-14
  const GAP = 8; // space-y-2
  const PANEL_H = THEME_CARD_H * VISIBLE_COUNT + GAP * (VISIBLE_COUNT - 1); // 248

  /**
   * 폭 비율
   */
  const LEFT_W = "md:w-[18%]";
  const RIGHT_W = "md:w-[82%]";

  const themeLabelMap = useMemo(() => {
    const m = new Map<string, { ko: string; en: string }>();
    for (const t of themes) m.set(t.key, getThemeTexts(t));
    return m;
  }, [themes]);

  const selectedTexts =
    themeLabelMap.get(selectedTheme) ?? { ko: selectedTheme, en: selectedTheme };

  // 스크롤 컨테이너 refs
  const themeScrollRef = useRef<HTMLDivElement | null>(null);
  const newsScrollRef = useRef<HTMLDivElement | null>(null);

  // 테마 로드
  useEffect(() => {
    let mounted = true;
    setLoadingThemes(true);
    setThemeError(null);

    const api = getApiBase();
    fetchJson<{ themes: ThemeItem[] }>(`${api}${THEME_LIST_ENDPOINT}`)
      .then((data) => {
        if (!mounted) return;
        const list = data?.themes ?? [];
        setThemes(list);

        if (list.length && !list.find((x) => x.key === selectedTheme)) {
          setSelectedTheme(list[0].key);
        }
      })
      .catch((e) => {
        if (!mounted) return;
        setThemeError(
          `섹터 목록을 불러오지 못했습니다. theme_list fetch failed: ${String(e)}`
        );
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingThemes(false);
      });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 뉴스 로드
  useEffect(() => {
    let mounted = true;
    setLoadingNews(true);
    setNewsError(null);

    const api = getApiBase();
    const q = new URLSearchParams();
    q.set("theme", selectedTheme);
    q.set("market", "all");
    q.set("limit", "20");

    fetchJson<{ news: ThemeNewsItem[] }>(
      `${api}${THEME_NEWS_ENDPOINT}?${q.toString()}`
    )
      .then((data) => {
        if (!mounted) return;
        setNews(data?.news ?? []);

        // 테마 변경 시 뉴스 스크롤 상단으로
        requestAnimationFrame(() => {
          const el = newsScrollRef.current;
          if (el) el.scrollTop = 0;
        });
      })
      .catch((e) => {
        if (!mounted) return;
        setNewsError(`테마 뉴스 로드 실패: ${String(e)}`);
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingNews(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedTheme]);

  return (
    <section className="mt-3">
      <div className="mb-1 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            산업으로 보는 뉴스
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            섹터(테마)별로 최신 뉴스를 모아서 확인합니다.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        {/* Left: Theme */}
        <div className={classNames("w-full", LEFT_W)}>
          <div className="relative rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="sr-only" aria-live="polite">
              {loadingThemes ? "섹터 로딩 중" : "섹터 로딩 완료"}
            </div>

            {themeError ? (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] leading-snug text-red-700">
                {themeError}
              </div>
            ) : null}

            <div
              ref={themeScrollRef}
              className="overflow-y-auto pr-1 [scrollbar-gutter:stable]"
              style={{ height: PANEL_H, maxHeight: PANEL_H }}
              aria-label="섹터 목록"
            >
              <div className="space-y-2">
                {themes.map((t) => {
                  const active = t.key === selectedTheme;
                  const { ko, en } = getThemeTexts(t);

                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setSelectedTheme(t.key)}
                      className={classNames(
                        "w-full h-14 rounded-2xl border px-2.5 transition",
                        "flex flex-col justify-center",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/25 focus-visible:ring-offset-2",
                        active
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-neutral-50 text-neutral-900 border-neutral-200 hover:bg-neutral-100 hover:border-neutral-300"
                      )}
                      title={`${ko} (${en})`}
                      aria-label={`섹터 선택: ${ko}`}
                      aria-pressed={active}
                    >
                      <div
                        className={classNames(
                          "text-[13px] font-semibold leading-tight",
                          active ? "text-white" : "text-neutral-900"
                        )}
                      >
                        {ko}
                      </div>
                      <div
                        className={classNames(
                          "mt-0.5 text-[11px] leading-tight",
                          active ? "text-white/70" : "text-neutral-500"
                        )}
                      >
                        {en}
                      </div>
                    </button>
                  );
                })}

                {!themes.length && !loadingThemes && !themeError ? (
                  <div className="rounded-2xl bg-neutral-50 p-3 text-[12px] text-neutral-600">
                    섹터가 없습니다.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Right: News */}
        <div className={classNames("w-full", RIGHT_W)}>
          <div className="relative rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="sr-only" aria-live="polite">
              {loadingNews
                ? `뉴스 로딩 중: ${selectedTexts.ko}`
                : `뉴스 로딩 완료: ${selectedTexts.ko}`}
            </div>

            {newsError ? (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {newsError}
              </div>
            ) : null}

            <div className="sr-only">{`선택된 섹터: ${selectedTexts.ko} (${selectedTexts.en})`}</div>

            <div
              ref={newsScrollRef}
              className="overflow-y-auto pr-1 [scrollbar-gutter:stable]"
              style={{ height: PANEL_H, maxHeight: PANEL_H }}
              aria-label={`산업 뉴스 목록: ${selectedTexts.ko}`}
            >
              <div className="space-y-3">
                {news.map((n) => {
                  const host = getHost(n.url);

                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setSelectedNews(toModalNewsItem(n))}
                      className={classNames(
                        "w-full text-left block rounded-2xl border border-neutral-200 bg-white",
                        "p-3 transition hover:bg-neutral-50 hover:border-neutral-300",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/25 focus-visible:ring-offset-2"
                      )}
                      title={n.title}
                      aria-label={`뉴스 상세 보기: ${n.title}`}
                    >
                      <div className="flex gap-3">
                        {n.image_url ? (
                          <img
                            src={n.image_url}
                            alt=""
                            className="h-[72px] w-[72px] flex-none rounded-2xl object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-[72px] w-[72px] flex-none rounded-2xl bg-neutral-100" />
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <MarketPill value={n.market_tag} />
                              {host ? <TagPill text={host} /> : null}
                              {(n.tags ?? []).slice(0, 2).map((t, i) => (
                                <TagPill key={`${n.id}-${i}`} text={t} />
                              ))}
                            </div>

                            <div className="ml-auto flex-none text-[11px] text-neutral-400 leading-none pt-1">
                              {formatKSTCompact(n.published_at)}
                            </div>
                          </div>

                          <div
                            className={classNames(
                              "mt-2 line-clamp-2",
                              "text-[14px] font-semibold tracking-[-0.01em] text-neutral-900",
                              "leading-[1.35]"
                            )}
                          >
                            {n.title}
                          </div>

                          <div
                            className={classNames(
                              "mt-1.5 line-clamp-2",
                              "text-[13px] text-neutral-600",
                              "leading-[1.45]"
                            )}
                          >
                            {n.summary}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {!news.length && !loadingNews && !newsError ? (
                  <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">
                    해당 섹터의 뉴스가 없습니다.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ News 페이지와 동일 UX: 상세 모달 */}
      {selectedNews && (
        <NewsDetailModal item={selectedNews} onClose={() => setSelectedNews(null)} />
      )}
    </section>
  );
}
