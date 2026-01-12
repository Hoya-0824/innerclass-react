// components/News/NewsDetailModal_main.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axios";

/** =========================
 * Types (Main-format)
 * ========================= */
export type NewsVocabulary = {
  term: string;
  definition: string;
};

export type NewsMainAnalysis = {
  deep_analysis_reasoning: string;
  keywords: string[];
  sentiment_score: number;
  vocabulary: NewsVocabulary[];
  analysis: {
    summary: string;
    bullet_points: string[];
    what_is_this: string[];
    why_important: string[];
    stock_impact: {
      positives: string[];
      warnings: string[];
    };
    strategy_guide: {
      short_term: string;
      long_term: string;
    };
    action_guide: string;
  };
};

export type NewsMainSummaryResponse = {
  success: boolean;
  article_id: number;
  article_title: string;
  summary?: string;
  analysis?: NewsMainAnalysis;
  error?: string;
};

/** =========================
 * Modal input item type
 * - Home.tsx의 TrendNewsItem / SectorNewsRow에 맞춰
 *   최소 호환 가능한 형태로 정의
 * ========================= */
export type NewsModalItem = {
  id?: number; // ✅ 있으면 main-summary 호출
  title: string;

  // 날짜 표기(이미 포맷된 문자열이든 ISO든 가능)
  date?: string;
  published_at?: string;

  // 이미지
  imageUrl?: string;
  image_url?: string;

  // 원문 링크
  originUrl?: string;
  url?: string; // sector row의 url
  link?: string; // trend item의 link

  // fallback summary / tags
  summary?: string;
  tags?: string[];
};

interface NewsDetailModalMainProps {
  item: NewsModalItem;
  onClose: () => void;
}

/** =========================
 * Helpers
 * ========================= */
function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function safeArray(v: any): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim().length > 0) : [];
}

function formatDateTimeKST(isoOrText: string): string {
  if (!isoOrText) return "";
  // 이미 "YYYY-MM-DD HH:mm" 같은 텍스트면 그대로 반환 (대충 판별)
  if (/^\d{4}-\d{2}-\d{2}/.test(isoOrText) && isoOrText.length <= 16) return isoOrText;

  try {
    const d = new Date(isoOrText);
    if (Number.isNaN(d.getTime())) return isoOrText;

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day} ${hh}:${mm}`;
  } catch {
    return isoOrText;
  }
}

function clamp0to100(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.trunc(n)));
}

function sentimentLabel(score: number): { text: string; cls: string } {
  const s = clamp0to100(score);
  if (s >= 70) return { text: `긍정 ${s}`, cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
  if (s <= 30) return { text: `부정 ${s}`, cls: "bg-rose-50 text-rose-700 ring-rose-200" };
  return { text: `중립 ${s}`, cls: "bg-amber-50 text-amber-700 ring-amber-200" };
}

const NewsDetailModalMain: React.FC<NewsDetailModalMainProps> = ({ item, onClose }) => {
  const navigate = useNavigate();

  const [analysis, setAnalysis] = useState<NewsMainAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const originUrl = useMemo(
    () => item.originUrl || item.url || item.link || "",
    [item.originUrl, item.url, item.link]
  );

  const displayDate = useMemo(() => {
    const raw = item.date || item.published_at || "";
    return raw ? formatDateTimeKST(raw) : "";
  }, [item.date, item.published_at]);

  const imageSrc = useMemo(() => item.imageUrl || item.image_url || "", [item.imageUrl, item.image_url]);
  const hasImage = useMemo(() => Boolean(imageSrc && imageSrc.trim().length > 0), [imageSrc]);

  /** =========================
   * Fetch main-summary (only if item.id exists)
   * ========================= */
  useEffect(() => {
    let mounted = true;

    const fetchMainSummary = async (newsId: number) => {
      setIsLoading(true);
      setError("");
      setAnalysis(null);

      try {
        // ✅ 당신의 views.py: GET /api/news/<id>/main-summary/
        const res = await api.get<NewsMainSummaryResponse>(`/news/${newsId}/main-summary/`);
        const data = res.data;

        if (!mounted) return;

        if (data?.success && data.analysis) {
          setAnalysis(data.analysis);
        } else {
          setError(data?.error || "분석에 실패했습니다.");
        }
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.response?.data?.error || "AI 분석 중 오류가 발생했습니다.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    if (typeof item.id === "number" && item.id > 0) {
      fetchMainSummary(item.id);
    } else {
      // id가 없으면 분석 호출 불가 → UI는 fallback만
      setIsLoading(false);
      setAnalysis(null);
      setError("");
    }

    return () => {
      mounted = false;
    };
  }, [item.id]);

  /** =========================
   * Close behaviors
   * ========================= */
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  /** =========================
   * UI Parts
   * ========================= */
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-5">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      <span className="ml-2 text-sm text-gray-500">AI가 분석 중입니다...</span>
    </div>
  );

  const SkeletonBlock = ({ lines = 3 }: { lines?: number }) => (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded w-full" style={{ width: `${100 - i * 10}%` }} />
      ))}
    </div>
  );

  const keywords = safeArray(analysis?.keywords);
  const bulletPoints = safeArray(analysis?.analysis?.bullet_points);
  const whatIsThis = safeArray(analysis?.analysis?.what_is_this);
  const whyImportant = safeArray(analysis?.analysis?.why_important);

  const positives = safeArray(analysis?.analysis?.stock_impact?.positives);
  const warnings = safeArray(analysis?.analysis?.stock_impact?.warnings);

  const shortTerm = analysis?.analysis?.strategy_guide?.short_term || "";
  const longTerm = analysis?.analysis?.strategy_guide?.long_term || "";
  const actionGuide = analysis?.analysis?.action_guide || "";

  const sentiment = sentimentLabel(analysis?.sentiment_score ?? 50);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={handleBackdropClick}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-fadeIn">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[#216BFF]/10 px-3 py-1 text-xs font-semibold text-[#216BFF]">
              AI 요약(메인)
            </span>

            {analysis ? (
              <span
                className={classNames(
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1",
                  sentiment.cls
                )}
              >
                {sentiment.text}
              </span>
            ) : null}
          </div>

          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="닫기">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Image (✅ 이미지 없으면 섹션 자체를 렌더링하지 않음) */}
        {hasImage ? (
          <div className="h-48 bg-gray-100 flex items-center justify-center">
            <img src={imageSrc} alt={item.title} className="w-full h-full object-cover" />
          </div>
        ) : null}

        {/* Content */}
        <div className="p-6">
          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h2>
          {displayDate ? <p className="text-sm text-gray-500 mb-4">{displayDate}</p> : null}

          {/* Keywords */}
          {analysis && keywords.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-6">
              {keywords.slice(0, 8).map((k, idx) => (
                <span
                  key={`${k}-${idx}`}
                  className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-sm px-3 py-1.5 rounded-full font-medium"
                >
                  {k}
                </span>
              ))}
            </div>
          ) : item.tags && item.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-6">
              {item.tags.slice(0, 8).map((tag, idx) => (
                <span
                  key={`${tag}-${idx}`}
                  className="inline-flex items-center bg-gray-100 text-gray-700 text-sm px-3 py-1.5 rounded-full font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          {/* Error (only show when we attempted fetch) */}
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-600 text-sm">{error}</p>
              {item.summary ? <p className="text-gray-500 text-xs mt-1">기본 요약: {item.summary}</p> : null}
              {!item.id ? <p className="text-gray-500 text-xs mt-1">※ id가 없어 AI 분석을 호출할 수 없습니다.</p> : null}
            </div>
          ) : null}

          {/* 핵심 요약 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 mb-6">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-lg">📌</span> 핵심 요약
            </h3>

            {isLoading ? (
              <SkeletonBlock lines={3} />
            ) : analysis ? (
              bulletPoints.length > 0 ? (
                <ol className="space-y-2 text-sm text-gray-700">
                  {bulletPoints.slice(0, 6).map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-gray-700 text-sm">{analysis.analysis?.summary || item.summary || "요약 정보가 없습니다."}</p>
              )
            ) : (
              <p className="text-gray-700 text-sm">{item.summary || "요약 정보가 없습니다."}</p>
            )}
          </div>

          {/* 무슨 말이야? */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-lg">🤔</span> 무슨 말이야?
            </h3>
            {isLoading ? (
              <SkeletonBlock lines={2} />
            ) : analysis ? (
              whatIsThis.length > 0 ? (
                <ul className="space-y-2 text-sm text-gray-600">
                  {whatIsThis.slice(0, 6).map((x, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-gray-400">•</span>
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600">{analysis.analysis?.summary || item.summary || "정보 없음"}</p>
              )
            ) : (
              <p className="text-sm text-gray-600">{item.summary || "정보 없음"}</p>
            )}
          </div>

          {/* 왜 중요해? */}
          {analysis ? (
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-lg">💡</span> 이게 왜 중요해?
              </h3>
              {isLoading ? (
                <SkeletonBlock lines={3} />
              ) : (
                <ul className="space-y-2 text-sm text-gray-600">
                  {(whyImportant.length > 0 ? whyImportant : []).slice(0, 8).map((x, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-gray-400">•</span>
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {/* 주식 영향 */}
          {analysis ? (
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-lg">📊</span> 이 뉴스가 주식에 주는 영향은?
              </h3>

              {isLoading ? (
                <SkeletonBlock lines={4} />
              ) : (
                <>
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-green-600 mb-2 flex items-center gap-1">
                      <span>✅</span> 긍정적인 점
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-600 ml-5">
                      {(positives.length > 0 ? positives : ["(없음)"]).slice(0, 8).map((x, idx) => (
                        <li key={idx}>• {x}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-amber-600 mb-2 flex items-center gap-1">
                      <span>⚠️</span> 주의할 점
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-600 ml-5">
                      {(warnings.length > 0 ? warnings : ["(없음)"]).slice(0, 8).map((x, idx) => (
                        <li key={idx}>• {x}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {/* AI 투자 시그널 */}
          <div className="bg-gray-50 rounded-xl p-5 mb-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-lg">🤖</span> AI 투자 시그널
            </h3>
            <p className="text-xs text-gray-500 mb-4">ⓘ 이 정보는 투자 권유가 아니라 판단 보조용 분석입니다.</p>

            {isLoading ? (
              <LoadingSpinner />
            ) : analysis ? (
              <>
                {/* Sentiment */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-700">감정 점수</span>
                  <span
                    className={classNames(
                      "inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ring-1",
                      sentiment.cls
                    )}
                  >
                    {sentiment.text}
                  </span>
                </div>

                {/* 전략 가이드 */}
                <div className="mb-4">
                  <span className="text-sm font-medium text-gray-700 block mb-2">🧭 전략 가이드</span>
                  <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                    <div className="grid grid-cols-2 border-b border-gray-200">
                      <div className="p-3 font-medium text-sm text-gray-700 border-r border-gray-200">단기 관점</div>
                      <div className="p-3 text-sm text-gray-600">{shortTerm || "정보 없음"}</div>
                    </div>
                    <div className="grid grid-cols-2">
                      <div className="p-3 font-medium text-sm text-gray-700 border-r border-gray-200">장기 관점</div>
                      <div className="p-3 text-sm text-gray-600">{longTerm || "정보 없음"}</div>
                    </div>
                  </div>
                </div>

                {/* 액션 가이드 */}
                <div className="mb-4">
                  <span className="text-sm font-medium text-gray-700 block mb-2">✅ 액션 가이드</span>
                  <div className="bg-white rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
                    {actionGuide || "정보 없음"}
                  </div>
                </div>

                <div className="bg-amber-50 rounded-lg p-3">
                  <span className="text-sm font-medium text-amber-700 flex items-center gap-1 mb-1">
                    <span>⚠️</span> 주의사항
                  </span>
                  <p className="text-sm text-gray-600">
                    이 분석은 AI가 생성한 정보로 투자 판단의 참고 자료입니다.
                    <br />
                    실제 투자 결정 전, 리스크/수급/실적/가이던스 등 추가 검증을 권장합니다.
                  </p>
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-600">
                {item.id ? "분석 결과가 없습니다." : "이 항목은 id가 없어 AI 분석을 호출할 수 없습니다."}
              </div>
            )}
          </div>

          {/* 단어(용어) */}
          {analysis ? (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-lg">📚</span> 이 기사의 단어
              </h3>

              {isLoading ? (
                <SkeletonBlock lines={3} />
              ) : analysis.vocabulary && analysis.vocabulary.length > 0 ? (
                <div className="space-y-4">
                  {analysis.vocabulary.slice(0, 12).map((v, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-1">{v.term}</h4>
                        <p className="text-sm text-gray-600 break-words">: {v.definition}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">표시할 용어가 없습니다.</p>
              )}
            </div>
          ) : null}

          {/* Footer Actions */}
          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-3 pb-4">
            {originUrl ? (
              <button
                onClick={() => window.open(originUrl, "_blank")}
                className="w-full sm:w-auto px-6 py-3 bg-gray-900 cursor-pointer hover:bg-gray-800 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <span>뉴스 원문 보러가기</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </button>
            ) : null}

            <button
              onClick={() => {
                const question =
                  `다음 뉴스 기사에 대해 궁금한 점이 있어.\n\n` +
                  `제목: ${item.title}\n` +
                  `링크: ${originUrl || "링크 없음"}\n\n` +
                  `이 기사의 주요 내용과 시사점을 알려줘.`;
                sessionStorage.setItem("chatbot_draft", question);
                sessionStorage.setItem("chatbot_autosend", "1");
                navigate("/chatbot");
              }}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 cursor-pointer hover:bg-blue-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <span>챗봇에게 물어보기</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsDetailModalMain;
