import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NewsItem } from '../../data/newsMockData';
import type { NewsAnalysis } from '../../types/newsSummary';
import api from '../../lib/axios';

// 캐릭터 아바타 및 아이콘 이미지
import woman1Avatar from '../../assets/woman_1.svg';
import woman2Avatar from '../../assets/woman_2.svg';
import aiAvatar from '../../assets/ai.svg';
import positiveIcon from '../../assets/positive.svg';
import warningIcon from '../../assets/warning.svg';

interface NewsDetailModalProps {
    item: NewsItem;
    onClose: () => void;
}


const NewsDetailModal: React.FC<NewsDetailModalProps> = ({ item, onClose }) => {
    const navigate = useNavigate();
    const [analysis, setAnalysis] = useState<NewsAnalysis | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // LLM 요약 API 호출
    useEffect(() => {
        const fetchSummary = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await api.get(`/news/${item.id}/summary/`);
                if (response.data.success) {
                    setAnalysis(response.data.analysis);
                } else {
                    setError(response.data.error || '분석에 실패했습니다.');
                }
            } catch (err: any) {
                setError(err.response?.data?.error || 'AI 분석 중 오류가 발생했습니다.');
            } finally {
                setIsLoading(false);
            }
        };

        if (item.id) {
            fetchSummary();
        }
    }, [item.id]);

    // 모달 외부 클릭 시 닫기
    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // ESC 키로 모달 닫기
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // 모달이 열리면 스크롤 방지
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // 로딩 스피너 컴포넌트
    const LoadingSpinner = () => (
        <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            <span className="ml-2 text-sm text-gray-500">AI가 분석 중입니다...</span>
        </div>
    );

    // 스켈레톤 로딩 컴포넌트
    const SkeletonBlock = ({ lines = 3 }: { lines?: number }) => (
        <div className="animate-pulse space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-full" style={{ width: `${100 - i * 10}%` }}></div>
            ))}
        </div>
    );

    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={handleBackdropClick}
        >
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-fadeIn">
                {/* Header with close button */}
                <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        {/* <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                        </button> */}
                        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </button>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Image */}
                <div className="h-48 bg-gray-100 flex items-center justify-center">
                    {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-gray-400 text-sm">이미지</span>
                    )}
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Title */}
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h2>
                    <p className="text-sm text-gray-500 mb-4">{item.date}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {item.tags?.map((tag, idx) => (
                            <span
                                key={idx}
                                className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-sm px-3 py-1.5 rounded-full font-medium"
                            >
                                {tag}
                                {idx === 0 && <span className="text-red-500">❤️</span>}
                                {idx === 1 && <span className="text-blue-500">💙</span>}
                            </span>
                        ))}
                    </div>

                    {/* Error State */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                            <p className="text-red-600 text-sm">{error}</p>
                            <p className="text-gray-500 text-xs mt-1">기본 요약: {item.summary}</p>
                        </div>
                    )}

                    {/* 핵심 요약 (Bullet Points) */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 mb-6">
                        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">핵심 요약</h3>
                        {isLoading ? (
                            <SkeletonBlock lines={3} />
                        ) : analysis ? (
                            <ol className="space-y-2 text-sm text-gray-700">
                                {analysis.bullet_points.map((point, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                        <span className="bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            {idx + 1}
                                        </span>
                                        <span>{point}</span>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p className="text-gray-600">{item.summary}</p>
                        )}
                    </div>

                    {/* 무슨 말이야? Section */}
                    <div className="bg-[#F8F9FA] rounded-3xl p-6 mb-6">
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                                <span className="inline-block bg-[#3B82F6] text-white text-sm font-bold px-4 py-2 rounded-lg mb-4 shadow-sm">
                                    무슨 말이야?
                                </span>
                                {isLoading ? (
                                    <SkeletonBlock lines={2} />
                                ) : analysis ? (
                                    <ul className="space-y-2 text-sm text-gray-800 font-medium leading-relaxed">
                                        {analysis.what_is_this.map((item, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <span className="text-[#3B82F6] mt-1.5">•</span>
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-600">{item.summary}</p>
                                )}
                            </div>
                            <div className="relative flex-shrink-0">
                                <img src={woman1Avatar} alt="캐릭터" className="w-24 h-24" />
                            </div>
                        </div>
                    </div>

                    {/* 이게 왜 중요해? Section */}
                    <div className="bg-[#F8F9FA] rounded-3xl p-6 mb-6">
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                                <span className="inline-block bg-[#3B82F6] text-white text-sm font-bold px-4 py-2 rounded-lg mb-4 shadow-sm">
                                    이게 왜 중요해?
                                </span>
                                {isLoading ? (
                                    <SkeletonBlock lines={3} />
                                ) : analysis ? (
                                    <ul className="space-y-2 text-sm text-gray-800 font-medium leading-relaxed">
                                        {analysis.why_important.map((item, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <span className="text-[#3B82F6] mt-1.5">•</span>
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                            </div>
                            <div className="relative flex-shrink-0">
                                <img src={woman2Avatar} alt="캐릭터" className="w-24 h-24" />
                            </div>
                        </div>
                    </div>

                    {/* 이 뉴스가 주식에 주는 영향은? Section */}
                    <div className="mb-6">
                        <h3 className="font-bold text-gray-900 mb-4 text-xl">
                            이 뉴스가 주식에 주는 영향은?
                        </h3>

                        {isLoading ? (
                            <SkeletonBlock lines={4} />
                        ) : analysis ? (
                            <div className="flex flex-col gap-4">
                                {/* 긍정적인 점 */}
                                <div className="bg-[#ECFDF5] rounded-3xl p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-8 h-8 rounded-full bg-[#D1FAE5] flex items-center justify-center">
                                            <img src={positiveIcon} alt="긍정" className="w-5 h-5" />
                                        </div>
                                        <h4 className="text-base font-bold text-[#059669]">긍정적인 점</h4>
                                    </div>
                                    <ul className="space-y-2 text-sm text-gray-800 font-medium">
                                        {analysis.stock_impact.positives.map((item, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <span className="text-[#059669] mt-1.5">•</span>
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* 주의할 점 */}
                                <div className="bg-[#FFF1F2] rounded-3xl p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-8 h-8 rounded-full bg-[#FFE4E6] flex items-center justify-center">
                                            <img src={warningIcon} alt="주의" className="w-5 h-5" />
                                        </div>
                                        <h4 className="text-base font-bold text-[#E11D48]">주의할 점</h4>
                                    </div>
                                    <ul className="space-y-2 text-sm text-gray-800 font-medium">
                                        {analysis.stock_impact.warnings.map((item, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <span className="text-[#E11D48] mt-1.5">•</span>
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* AI 투자 시그널 Section */}
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <img src={aiAvatar} alt="AI" className="w-12 h-12" />
                            <div>
                                <h3 className="font-bold text-gray-900 text-base">AI 투자 시그널</h3>
                                <p className="text-xs text-gray-500">ⓘ 이 정보는 투자 권유가 아니라 판단 보조용 분석이에요.</p>
                            </div>
                        </div>

                        {isLoading ? (
                            <LoadingSpinner />
                        ) : analysis ? (
                            <>
                                {/* 전략 가이드 */}
                                <div className="bg-white rounded-xl overflow-hidden border border-gray-200 mb-4">
                                    <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                                        <span className="text-sm font-semibold text-gray-800">전략 가이드</span>
                                    </div>
                                    <div className="divide-y divide-gray-100">
                                        <div className="grid grid-cols-[100px_1fr]">
                                            <div className="p-3 bg-gray-50 font-medium text-sm text-gray-700 border-r border-gray-100">단기 관점</div>
                                            <div className="p-3 text-sm text-gray-600">
                                                {analysis.strategy_guide?.short_term || '정보 없음'}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-[100px_1fr]">
                                            <div className="p-3 bg-gray-50 font-medium text-sm text-gray-700 border-r border-gray-100">장기 관점</div>
                                            <div className="p-3 text-sm text-gray-600">
                                                {analysis.strategy_guide?.long_term || '정보 없음'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 주의사항 */}
                                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                                    <div className="flex items-start gap-2">
                                        <span className="text-amber-500 text-lg">⚠️</span>
                                        <div>
                                            <span className="text-sm font-semibold text-amber-700 block mb-1">주의사항</span>
                                            <p className="text-sm text-gray-600 leading-relaxed">
                                                이 분석은 AI가 생성한 정보로 투자 결정의 참고 자료로만 활용하세요.<br />
                                                실제 투자 결정 전 전문가 상담을 권장합니다.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>

                    {/* 그래서, 투자는 */}
                    <div className="mb-6">
                        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="text-lg">❓</span> 그래서, 투자는
                        </h3>
                        {isLoading ? (
                            <SkeletonBlock lines={2} />
                        ) : analysis ? (
                            <ul className="space-y-2 text-sm text-gray-600">
                                {analysis.investment_action.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                        <span className="text-gray-400">•</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </div>

                    {/* 이 기사의 단어 Section */}
                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="text-lg">📚</span> 이 기사의 단어
                        </h3>
                        {isLoading ? (
                            <SkeletonBlock lines={3} />
                        ) : analysis ? (
                            <div className="space-y-4">
                                {analysis.vocabulary.map((vocab, idx) => (
                                    <div key={idx} className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-medium text-gray-900 mb-1">{vocab.term}</h4>
                                            <p className="text-sm text-gray-500">: {vocab.definition}</p>
                                        </div>
                                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-3 pb-4">
                        {item.originUrl && (
                            <button
                                onClick={() => window.open(item.originUrl, '_blank')}
                                className="w-full sm:w-auto px-6 py-3 bg-gray-900 cursor-pointer hover:bg-gray-800 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                data-gtm-click="original_link"
                            >
                                <span>뉴스 원문 보러가기</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                    <polyline points="15 3 21 3 21 9"></polyline>
                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                            </button>
                        )}
                        <button
                            onClick={() => {
                                const question = `다음 뉴스 기사에 대해 궁금한 점이 있어.\n\n제목: ${item.title}\n링크: ${item.originUrl || '링크 없음'}\n\n이 기사의 주요 내용과 시사점을 알려줘.`;
                                sessionStorage.setItem('chatbot_draft', question);
                                sessionStorage.setItem('chatbot_autosend', '1');
                                // GTM Context
                                sessionStorage.setItem('chatbot_source', 'news_detail');
                                sessionStorage.setItem('chatbot_news_id', String(item.id));
                                navigate('/chatbot');
                            }}
                            className="w-full sm:w-auto px-6 py-3 bg-blue-600 cursor-pointer hover:bg-blue-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            data-gtm-action="ai_deep_dive"
                        >
                            <span>챗봇에게 물어보기</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewsDetailModal;
