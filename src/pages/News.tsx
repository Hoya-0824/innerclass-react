import { useState, useEffect } from 'react';
import NewsFilterBar from '../components/News/NewsFilterBar';
import NewsCard from '../components/News/NewsCard';
import NewsDetailModal from '../components/News/NewsDetailModal';
import TrendList from '../components/News/TrendList';
import { TREND_DIVIDEND, TREND_VALUE, type NewsItem } from '../data/newsMockData';
import api from '../lib/axios';

const News = () => {
    const [aiBriefingNews, setAiBriefingNews] = useState<NewsItem[]>([]);
    const [keywordNews, setKeywordNews] = useState<NewsItem[]>([]);
    const [keywords, setKeywords] = useState<string[]>([]);
    const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
    const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
    const [marketFilter, setMarketFilter] = useState<'all' | 'domestic' | 'international'>('all');

    const [isLoading, setIsLoading] = useState(false);
    const [isKeywordLoading, setIsKeywordLoading] = useState(false);

    // 표시할 키워드 목록 (전체 제외)
    const displayKeywords = keywords.slice(0, 3);

    const getNewsData = async (keyword?: string, market: string = 'all') => {
        // [Frontend Trick] '전체' 탭을 선택해도 '국내' 뉴스와 동일한 결과를 보여주기 위해
        // API 호출 시에는 'all' 대신 'domestic'을 사용합니다.
        const apiMarket = market === 'all' ? 'domestic' : market;

        const params = new URLSearchParams();
        if (keyword) params.append('keyword', keyword);
        params.append('market', apiMarket);

        const url = `/news/ai-recommend/?${params.toString()}`;
        const response = await api.get(url);

        const newsList = response.data.news || [];
        const mappedData: NewsItem[] = newsList.map((item: any) => ({
            id: item.id,
            title: item.title,
            summary: item.summary,
            date: item.published_at ? new Date(item.published_at).toLocaleDateString() : '날짜 미상',
            tags: [item.tag || "뉴스"],
            imageUrl: item.image_url || "https://images.unsplash.com/photo-1611974765270-ca1258822981?w=800&auto=format&fit=crop"
        }));

        return { news: mappedData, keywords: response.data.keywords };
    };

    // 초기 로딩 및 marketFilter 변경 시
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                // 1. AI Briefing (전체/추천 뉴스) 가져오기
                const generalData = await getNewsData(undefined, marketFilter);
                setAiBriefingNews(generalData.news);

                // 키워드 설정
                let currentKeywords = generalData.keywords || [];
                if (currentKeywords.length > 0) {
                    setKeywords(currentKeywords);
                }

                // 2. 키워드 뉴스 가져오기 (첫번째 키워드 선택)
                // 기존 선택된 키워드가 있고 유효하다면 유지, 아니면 첫번째 것 선택
                let targetKw = selectedKeyword;
                const isTargetValid = targetKw && targetKw !== '#전체' && currentKeywords.includes(targetKw);

                if (!isTargetValid && currentKeywords.length > 0) {
                    targetKw = currentKeywords[0];
                }

                if (targetKw) {
                    setSelectedKeyword(targetKw);
                    setIsKeywordLoading(true);
                    const kwData = await getNewsData(targetKw.replace('#', ''), marketFilter);
                    setKeywordNews(kwData.news);
                    setIsKeywordLoading(false);
                }

            } catch (error) {
            } finally {
                setIsLoading(false);
            }
        };

        init();
    }, [marketFilter]);

    const handleMarketFilterChange = (filter: 'all' | 'domestic' | 'international') => {
        setMarketFilter(filter);
    };

    const handleKeywordClick = async (keyword: string) => {
        if (keyword === selectedKeyword) return;

        setSelectedKeyword(keyword);
        setIsKeywordLoading(true);
        try {
            const cleanKeyword = keyword.replace('#', '');
            const data = await getNewsData(cleanKeyword, marketFilter);
            setKeywordNews(data.news);
        } catch (error) {
        } finally {
            setIsKeywordLoading(false);
        }
    };

    return (
        <div className="max-w-[1240px] px-4 md:px-6 mx-auto mt-6 md:mt-12 pb-20">

            {/* Filter & Search */}
            <NewsFilterBar
                activeFilter={marketFilter}
                onFilterChange={handleMarketFilterChange}
            />

            {/* Section 1: Today's AI Briefing (Formerly #All Content) */}
            <section className="mb-16">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">오늘의 AI 브리핑</h2>
                    <p className="text-gray-500 text-sm">AI가 추천하는 나에게 맞는 뉴스를 브리핑 해줬어요.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        <div className="col-span-3 text-center py-10 text-gray-400">
                            AI 브리핑을 불러오는 중입니다...
                        </div>
                    ) : aiBriefingNews.length > 0 ? (
                        aiBriefingNews.slice(0, 3).map((item) => (
                            <div key={item.id} className="h-full">
                                <NewsCard item={item} onClick={() => setSelectedNews(item)} />
                            </div>
                        ))
                    ) : (
                        <div className="col-span-3 text-center py-10 text-gray-400">
                            {marketFilter === 'international'
                                ? '해외 뉴스가 없습니다.'
                                : '추천 뉴스가 없습니다.'}
                        </div>
                    )}
                </div>
            </section>

            {/* Section 2: My Keyword News */}
            <section className="mb-16">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">내 키워드 뉴스</h2>
                        <div className="flex flex-wrap gap-2">
                            {displayKeywords.map((keyword, idx) => (
                                <span
                                    key={idx}
                                    onClick={() => handleKeywordClick(keyword)}
                                    className={`px-4 py-2 border rounded-full text-sm font-medium transition-all cursor-pointer ${selectedKeyword === keyword
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isKeywordLoading ? (
                        <div className="col-span-3 text-center py-10 text-gray-400">
                            키워드 뉴스를 불러오는 중입니다...
                        </div>
                    ) : keywordNews.length > 0 ? (
                        keywordNews.slice(0, 3).map((item) => (
                            <div key={item.id} className="h-full">
                                <NewsCard item={item} onClick={() => setSelectedNews(item)} />
                            </div>
                        ))
                    ) : (
                        <div className="col-span-3 text-center py-10 text-gray-400">
                            해당 키워드의 뉴스가 없습니다.
                        </div>
                    )}
                </div>
            </section>

            {/* Section 3: Today's Trend News */}
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

            {/* News Detail Modal */}
            {selectedNews && (
                <NewsDetailModal
                    item={selectedNews}
                    onClose={() => setSelectedNews(null)}
                />
            )}
        </div>
    );
};

export default News;
