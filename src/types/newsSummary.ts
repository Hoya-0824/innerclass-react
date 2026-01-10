// LLM 뉴스 요약 API 응답 타입
export interface VocabularyItem {
    term: string;
    definition: string;
}

export interface StockImpact {
    positives: string[];
    warnings: string[];
}

export interface StrategyGuide {
    short_term: string;
    long_term: string;
}

export interface NewsAnalysis {
    bullet_points: string[];
    what_is_this: string[];
    why_important: string[];
    stock_impact: StockImpact;
    sentiment_score: number;
    strategy_guide: StrategyGuide;
    investment_action: string[];
    vocabulary: VocabularyItem[];
}

export interface NewsSummaryResponse {
    success: boolean;
    article_id: number;
    article_title: string;
    analysis: NewsAnalysis;
}
