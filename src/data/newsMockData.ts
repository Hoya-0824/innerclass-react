export interface NewsItem {
    id: number;
    title: string;
    date: string;
    summary?: string;
    tags?: string[];
    imageUrl?: string;
    originUrl?: string;
}

export interface TrendItem {
    id: number;
    label: string;
    title: string;
    date: string;
}

export const TREND_DIVIDEND: TrendItem[] = [
    { id: 1, label: "KT&G", title: "KT&G, 헴어워드 코리아 2025 대기업 종합...", date: "2026-01-02" },
    { id: 2, label: "SK텔레콤", title: "SK텔레콤, 2026년 AI 파운데이션 모델 발표", date: "2026-01-02" },
    { id: 3, label: "하나금융지주", title: "함영주 하나금융 회장 신년사 — 금융 패러...", date: "2026-01-02" },
];

export const TREND_VALUE: TrendItem[] = [
    { id: 1, label: "KB금융", title: "KB금융, 2026년 전략 방향 발표", date: "2026-01-02" },
    { id: 2, label: "BNK금융지주", title: "배당 분리과세 시행 앞두고 BNK금융지주...", date: "2026-01-02" },
    { id: 3, label: "SK가스", title: "SK가스 2026년 LPG 가격 '동결' 결정", date: "2026-01-02" },
];


