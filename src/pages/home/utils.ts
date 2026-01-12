export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

/**
 * ✅ percent points 기반 표기
 *  - 30.0 -> "+30%"
 *  - -5.01 -> "-5%"
 *  - 0.49 -> "0%" (기본은 정수 표시)
 */
export function formatPct(x: number | null | undefined): string {
  if (x === null || x === undefined || Number.isNaN(x)) return "-";
  const v = Math.trunc(x);
  if (v > 0) return `+${v}%`;
  if (v < 0) return `${v}%`;
  return "0%";
}

export function getAccessToken(): string | null {
  return localStorage.getItem("access_token");
}

export function formatDateTimeKST(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day} ${hh}:${mm}`;
  } catch {
    return "";
  }
}

/**
 * ✅ change_rate 스케일 혼재 교정
 * - abs(x) <= 1.0 인 경우: ratio(0.3=30%)로 보고 *100
 * - 그 외: percent points로 간주(30=30%)
 */
export function normalizePctPoints(x: number | null | undefined): number | null {
  if (x === null || x === undefined || Number.isNaN(x)) return null;

  const ax = Math.abs(x);

  // ratio로 오는 케이스(대개 0.xx)
  if (ax > 0 && ax <= 1.0) {
    return x * 100.0;
  }

  // percent points로 오는 케이스(대개 1~30 정도)
  return x;
}

export function formatPriceByMarket(marketLabel: string, price: number | null | undefined): string {
  if (price === null || price === undefined || Number.isNaN(price)) return "-";

  const mk = (marketLabel || "").toUpperCase();
  if (mk === "NASDAQ") {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
        Math.trunc(price)
      );
    } catch {
      return `$${Math.trunc(price).toLocaleString("en-US")}`;
    }
  }

  // KOSPI / KOSDAQ
  try {
    return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(
      Math.trunc(price)
    );
  } catch {
    return `₩${Math.trunc(price).toLocaleString("ko-KR")}`;
  }
}

export function getHost(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
