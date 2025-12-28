import { useEffect, useState } from "react";

type Market = "KR" | "US";

interface StockItem {
    symbol: string;
    name: string;
    exchange: string;
    currency: string;
    open: number | null;
    close: number | null;
    intraday_pct: number | null;
    market_cap: number | null;
}

interface TodayMarketResponse {
    market: Market;
    asof: string;
    top_market_cap: StockItem[];
    top_drawdown: StockItem[];
}

const pctColor = (v: number | null) => {
    if (v === null) return "text-gray-500";
    return v < 0 ? "text-blue-600" : "text-red-600";
};

const fmtPct = (v: number | null) => {
    if (v === null) return "-";
    const sign = v > 0 ? "+" : "";
    return `${sign}${v.toFixed(2)}%`;
};

const fmtNum = (v: number | null) =>
    v === null ? "-" : v.toLocaleString();

const StockCard = ({ stock }: { stock: StockItem }) => {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
                <div>
                    <div className="text-base font-semibold text-gray-900">
                        {stock.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        {stock.symbol}
                        {stock.exchange && ` · ${stock.exchange}`}
                    </div>
                </div>
                <div className={`text-lg font-bold ${pctColor(stock.intraday_pct)}`}>
                    {fmtPct(stock.intraday_pct)}
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                    <div className="text-gray-500">현재가</div>
                    <div className="font-medium text-gray-900">
                        {fmtNum(stock.close)}
                    </div>
                </div>
                <div>
                    <div className="text-gray-500">시가</div>
                    <div className="font-medium text-gray-900">
                        {fmtNum(stock.open)}
                    </div>
                </div>
            </div>
        </div>
    );
};

const Home = () => {
    const [market, setMarket] = useState<Market>("KR");
    const [data, setData] = useState<TodayMarketResponse | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/markets/today/?market=${market}`)
            .then((res) => res.json())
            .then(setData)
            .finally(() => setLoading(false));
    }, [market]);

    return (
        <main className="max-w-[1200px] px-4 md:px-8 mx-auto mt-6 md:mt-10 min-h-[500px]">
            {/* 헤더 */}
            <div className="flex items-end justify-between mb-6">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                        오늘의 증시
                    </h2>
                    {data && (
                        <p className="text-sm text-gray-500 mt-1">
                            기준일 {data.asof}
                        </p>
                    )}
                </div>

                <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
                    {(["KR", "US"] as Market[]).map((m) => (
                        <button
                            key={m}
                            onClick={() => setMarket(m)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium
                                ${
                                    market === m
                                        ? "bg-gray-900 text-white"
                                        : "text-gray-700"
                                }`}
                        >
                            {m === "KR" ? "한국" : "미국"}
                        </button>
                    ))}
                </div>
            </div>

            {loading && (
                <div className="text-sm text-gray-500">불러오는 중...</div>
            )}

            {data && (
                <>
                    {/* 시총 TOP 3 */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">
                            시가총액 TOP 3
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {data.top_market_cap.slice(0, 3).map((s) => (
                                <StockCard key={`cap-${s.symbol}`} stock={s} />
                            ))}
                        </div>
                    </section>

                    {/* 전일 변화(낙폭) TOP 3 */}
                    <section className="mt-10">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">
                            전일 변화 TOP 3 (시가 대비)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {data.top_drawdown.slice(0, 3).map((s) => (
                                <StockCard key={`dd-${s.symbol}`} stock={s} />
                            ))}
                        </div>
                    </section>
                </>
            )}
        </main>
    );
};

export default Home;

