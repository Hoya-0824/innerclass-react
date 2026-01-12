import { classNames, formatPct, formatPriceByMarket } from "../utils";
import type { StockRow } from "../types";

/**
 * Home.tsx에서 넘겨주는 sessions?.KOSPI?.status 의 타입과 동일하게 맞춤
 * (향후 ../types 로 이동해도 됨)
 */
export type MarketSessionStatus = "OPEN" | "PRE_OPEN" | "POST_CLOSE" | "CLOSED" | "HOLIDAY";

function ArrowBadge({ pct }: { pct: number | null }) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 ring-1 ring-black/5">
        —
      </span>
    );
  }

  if (pct === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-bold text-neutral-700 ring-1 ring-black/5">
        0%
      </span>
    );
  }

  const up = pct > 0;
  const bg = up ? "bg-rose-50 ring-rose-200 text-rose-700" : "bg-blue-50 ring-blue-200 text-blue-700";
  return (
    <span className={classNames("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1", bg)}>
      <span className="leading-none">{up ? "▲" : "▼"}</span>
      <span className="tabular-nums">{formatPct(pct)}</span>
    </span>
  );
}

/** ============================
 *  ✅ 오늘의 증시 UI
 * ============================ */
function MarketPill({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#216BFF]/10 px-2.5 py-1 text-[11px] font-bold text-[#216BFF]">
      {text}
    </span>
  );
}

function PricePill({ marketLabel, price }: { marketLabel: string; price: number | null }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[12px] font-extrabold text-neutral-900 ring-1 ring-black/10 tabular-nums">
      {formatPriceByMarket(marketLabel, price)}
    </span>
  );
}

function MoverTile({
  kind,
  row,
  marketLabel,
}: {
  kind: "gainer" | "loser";
  row: StockRow | null;
  marketLabel: string;
}) {
  const isGainer = kind === "gainer";
  const label = isGainer ? "급상승 1위" : "급하락 1위";

  if (!row) {
    return (
      <div className="rounded-2xl bg-white p-3 ring-1 ring-black/5">
        <div className="text-[11px] font-semibold text-neutral-500">{label}</div>
        <div className="mt-2 text-sm text-neutral-500">데이터가 없습니다.</div>
      </div>
    );
  }

  const price = row.close ?? null;
  const pct = row.intraday_pct ?? row.change_pct ?? null;

  return (
    <div className={classNames("rounded-2xl bg-white p-3 ring-1 ring-black/5 transition", "hover:shadow-sm hover:ring-black/10")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-neutral-500">{label}</div>
          <div className="mt-1 truncate text-[14px] font-extrabold text-neutral-900">{row.name}</div>

          <div className="mt-1.5 flex items-center gap-2 text-xs text-neutral-500">
            <span className="truncate font-semibold text-neutral-700">{row.symbol}</span>
            <span className="text-neutral-300">•</span>
            <span className="text-[11px] font-semibold text-neutral-500">{marketLabel}</span>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <PricePill marketLabel={marketLabel} price={price} />
          <ArrowBadge pct={pct} />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px]">
        <div
          className={classNames(
            "inline-flex items-center gap-2 rounded-full px-2.5 py-1 font-semibold ring-1",
            isGainer ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-blue-50 text-blue-700 ring-blue-200"
          )}
        >
          <span className="leading-none">{isGainer ? "▲" : "▼"}</span>
          <span>{isGainer ? "상승 모멘텀" : "하락 압력"}</span>
        </div>
        <div />
      </div>
    </div>
  );
}

/**
 * 세션 배지(아이콘) - marketLabel 옆에 붙일 것
 * - OPEN: 초록(●) 개장
 * - PRE_OPEN: 파랑(◔) 개장 임박
 * - POST_CLOSE: 보라(◑) 폐장 직후
 * - CLOSED: 회색(●) 폐장
 * - HOLIDAY: 주황(●) 휴장
 */
function SessionPill({ status }: { status?: MarketSessionStatus }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-bold text-neutral-600 ring-1 ring-black/5">
        <span className="leading-none">•</span>
        <span>로딩</span>
      </span>
    );
  }

  const map: Record<MarketSessionStatus, { text: string; cls: string; icon: string }> = {
    OPEN: {
      text: "개장",
      cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      icon: "●",
    },
    PRE_OPEN: {
      text: "개장임박",
      cls: "bg-sky-50 text-sky-700 ring-sky-200",
      icon: "◔",
    },
    POST_CLOSE: {
      text: "폐장직후",
      cls: "bg-violet-50 text-violet-700 ring-violet-200",
      icon: "◑",
    },
    CLOSED: {
      text: "폐장",
      cls: "bg-neutral-100 text-neutral-700 ring-black/10",
      icon: "●",
    },
    HOLIDAY: {
      text: "휴장",
      cls: "bg-amber-50 text-amber-800 ring-amber-200",
      icon: "●",
    },
  };

  const { text, cls, icon } = map[status];
  return (
    <span className={classNames("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1", cls)}>
      <span className="leading-none">{icon}</span>
      <span>{text}</span>
    </span>
  );
}

export function MarketMoversCard({
  title,
  marketLabel,
  topGainer,
  topLoser,
  sessionStatus, // ✅ NEW
}: {
  title: string;
  marketLabel: string;
  topGainer: StockRow | null;
  topLoser: StockRow | null;
  sessionStatus?: MarketSessionStatus; // ✅ NEW
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-[#216BFF]/8 to-transparent" />
      <div className="relative p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-sm font-extrabold text-neutral-900">{title}</div>

              {/* market label */}
              <MarketPill text={marketLabel} />

              {/* ✅ session badge */}
              <SessionPill status={sessionStatus} />
            </div>
          </div>
          <div />
        </div>

        <div className="mt-2.5 grid grid-cols-1 gap-2.5">
          <MoverTile kind="gainer" row={topGainer} marketLabel={marketLabel} />
          <MoverTile kind="loser" row={topLoser} marketLabel={marketLabel} />
        </div>
      </div>
    </div>
  );
}
