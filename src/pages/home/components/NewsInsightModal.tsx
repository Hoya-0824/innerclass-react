// src/pages/home/components/NewsInsightModal.tsx
import { useEffect, useState } from "react";
import { classNames } from "../utils";
import { fetchNewsAnalysisById } from "../api";
import type { NewsDetailItem, NewsAnalysis, AnalysisSource } from "../types";

export function NewsInsightModal({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item: NewsDetailItem | null;
  onClose: () => void;
}) {
  const [analysis, setAnalysis] = useState<NewsAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // 스크롤 락
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // 분석 로드
  useEffect(() => {
    if (!open || !item) return;

    const controller = new AbortController();

    const run = async () => {
      setError("");
      setAnalysis(null);

      const id = item.id ?? 0;
      if (!id || id <= 0) return;

      const src: AnalysisSource = item.analysisSource ?? "news";

      setIsLoading(true);
      try {
        const a = await fetchNewsAnalysisById(id, src, controller.signal);
        setAnalysis(a);
      } catch (e: any) {
        setError(e?.message ?? "AI 분석에 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [open, item?.id, item?.analysisSource]);

  if (!open || !item) return null;

  const SkeletonBlock = ({ lines = 3 }: { lines?: number }) => (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-neutral-200" style={{ width: `${100 - i * 10}%` }} />
      ))}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {item.marketTag ? (
                <span
                  className={classNames(
                    "inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold ring-1",
                    item.marketTag.cls
                  )}
                >
                  {item.marketTag.text}
                </span>
              ) : null}
              {item.related?.name ? (
                <span className="inline-flex items-center rounded-lg bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 ring-1 ring-black/5">
                  {item.related.name}
                  {item.related.code ? <span className="ml-1 text-neutral-400">({item.related.code})</span> : null}
                </span>
              ) : null}
            </div>
            <div className="mt-2 line-clamp-2 text-base font-extrabold text-neutral-900">{item.title}</div>
            {item.date ? <div className="mt-1 text-xs text-neutral-500">{item.date}</div> : null}
          </div>

          <button onClick={onClose} className="rounded-full p-2 hover:bg-neutral-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* image */}
        <div className="h-48 bg-neutral-100">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">이미지</div>
          )}
        </div>

        {/* content */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {/* tags */}
          {item.tags && item.tags.length > 0 ? (
            <div className="mb-6 flex flex-wrap gap-2">
              {item.tags.map((t, idx) => (
                <span key={`${t}:${idx}`} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700">
                  {t}
                </span>
              ))}
            </div>
          ) : null}

          {/* error */}
          {error ? (
            <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm text-rose-700">{error}</p>
              {item.summary ? <p className="mt-1 text-xs text-neutral-500">기본 요약: {item.summary}</p> : null}
            </div>
          ) : null}

          {/* 핵심 요약 */}
          <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
            <h3 className="mb-3 flex items-center gap-2 font-extrabold text-neutral-900">
              <span className="text-lg">📌</span> 핵심 요약
            </h3>

            {isLoading ? (
              <SkeletonBlock lines={3} />
            ) : analysis ? (
              <ol className="space-y-2 text-sm text-neutral-700">
                {analysis.bullet_points?.map((p, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      {idx + 1}
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            ) : item.summary ? (
              <p className="text-sm text-neutral-700">{item.summary}</p>
            ) : (
              <p className="text-sm text-neutral-600">표시할 요약이 없습니다.</p>
            )}
          </div>

          {/* 무슨 말이야? */}
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 font-extrabold text-neutral-900">
              <span className="text-lg">🤔</span> 무슨 말이야?
            </h3>

            {isLoading ? (
              <SkeletonBlock lines={2} />
            ) : analysis ? (
              <ul className="space-y-2 text-sm text-neutral-600">
                {analysis.what_is_this?.map((x, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-neutral-400">•</span>
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            ) : item.summary ? (
              <p className="text-sm text-neutral-600">{item.summary}</p>
            ) : null}
          </div>

          {/* 이게 왜 중요해? */}
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 font-extrabold text-neutral-900">
              <span className="text-lg">💡</span> 이게 왜 중요해?
            </h3>

            {isLoading ? (
              <SkeletonBlock lines={3} />
            ) : analysis ? (
              <ul className="space-y-2 text-sm text-neutral-600">
                {analysis.why_important?.map((x, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-neutral-400">•</span>
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* 주식 영향 */}
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 font-extrabold text-neutral-900">
              <span className="text-lg">📊</span> 이 뉴스가 주식에 주는 영향은?
            </h3>

            {isLoading ? (
              <SkeletonBlock lines={4} />
            ) : analysis ? (
              <>
                <div className="mb-4">
                  <h4 className="mb-2 flex items-center gap-1 text-sm font-semibold text-emerald-700">
                    <span>✅</span> 긍정적인 점
                  </h4>
                  <ul className="ml-5 space-y-1 text-sm text-neutral-600">
                    {(analysis.stock_impact?.positives ?? []).map((x, idx) => (
                      <li key={idx}>• {x}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="mb-2 flex items-center gap-1 text-sm font-semibold text-amber-700">
                    <span>⚠️</span> 주의할 점
                  </h4>
                  <ul className="ml-5 space-y-1 text-sm text-neutral-600">
                    {(analysis.stock_impact?.warnings ?? []).map((x, idx) => (
                      <li key={idx}>• {x}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : null}
          </div>

          {/* AI 투자 시그널 */}
          <div className="mb-6 rounded-xl bg-neutral-50 p-5">
            <h3 className="mb-4 flex items-center gap-2 font-extrabold text-neutral-900">
              <span className="text-lg">🤖</span> AI 투자 시그널
            </h3>
            <p className="mb-4 text-xs text-neutral-500">ⓘ 이 정보는 투자 권유가 아니라 판단 보조용 분석입니다.</p>

            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-neutral-900" />
                <span className="ml-2 text-sm text-neutral-500">AI가 분석 중입니다...</span>
              </div>
            ) : analysis ? (
              <>
                <div className="mb-4">
                  <span className="mb-2 block text-sm font-semibold text-neutral-700">🧭 전략 가이드</span>
                  <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                    <div className="grid grid-cols-2 border-b border-neutral-200">
                      <div className="border-r border-neutral-200 p-3 text-sm font-medium text-neutral-700">단기 관점</div>
                      <div className="p-3 text-sm text-neutral-600">{analysis.strategy_guide?.short_term || "정보 없음"}</div>
                    </div>
                    <div className="grid grid-cols-2">
                      <div className="border-r border-neutral-200 p-3 text-sm font-medium text-neutral-700">장기 관점</div>
                      <div className="p-3 text-sm text-neutral-600">{analysis.strategy_guide?.long_term || "정보 없음"}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-amber-50 p-3">
                  <span className="mb-1 flex items-center gap-1 text-sm font-semibold text-amber-800">
                    <span>⚠️</span> 주의사항
                  </span>
                  <p className="text-sm text-neutral-600">
                    이 분석은 AI가 생성한 정보로 투자 결정의 참고 자료로만 활용하세요.
                    <br />
                    실제 투자 결정 전 추가 확인(공시/원문/리스크)을 권장합니다.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-neutral-600">분석 데이터가 없습니다.</p>
            )}
          </div>

          {/* 그래서, 투자는 */}
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 font-extrabold text-neutral-900">
              <span className="text-lg">❓</span> 그래서, 투자는
            </h3>

            {isLoading ? (
              <SkeletonBlock lines={2} />
            ) : analysis ? (
              <ul className="space-y-2 text-sm text-neutral-600">
                {analysis.investment_action?.map((x, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-neutral-400">•</span>
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* 단어 */}
          <div className="border-t border-neutral-200 pt-6">
            <h3 className="mb-4 flex items-center gap-2 font-extrabold text-neutral-900">
              <span className="text-lg">📚</span> 이 기사의 단어
            </h3>

            {isLoading ? (
              <SkeletonBlock lines={3} />
            ) : analysis ? (
              <div className="space-y-4">
                {analysis.vocabulary?.map((v, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-neutral-900">{v.term}</div>
                      <div className="text-sm text-neutral-500">: {v.definition}</div>
                    </div>
                    <button className="rounded-lg p-2 hover:bg-neutral-100" type="button" aria-label="bookmark">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-600">분석 단어 데이터가 없습니다.</p>
            )}
          </div>

          {/* footer */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 pb-4 sm:flex-row">
            {item.originUrl ? (
              <button
                type="button"
                onClick={() => window.open(item.originUrl, "_blank", "noreferrer")}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 font-bold text-white shadow-lg transition-all hover:bg-neutral-800 hover:shadow-xl sm:w-auto"
              >
                <span>뉴스 원문 보러가기</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                const question = `다음 뉴스 기사에 대해 궁금한 점이 있어.\n\n제목: ${item.title}\n링크: ${item.originUrl || "링크 없음"}\n\n이 기사의 주요 내용과 시사점을 알려줘.`;
                sessionStorage.setItem("chatbot_draft", question);
                sessionStorage.setItem("chatbot_autosend", "1");
                window.location.href = "/chatbot";
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl sm:w-auto"
            >
              <span>챗봇에게 물어보기</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          </div>

          {/* hint */}
          {!item.id ? (
            <div className="mt-2 rounded-xl bg-neutral-50 p-3 text-xs text-neutral-500 ring-1 ring-black/5">
              이 항목은 기사 ID가 없어 분석 API 호출을 생략했습니다.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
