export interface TickerItem {
  name: string;   // 표시용 종목명
  value: string;  // symbol (예: AAPL, A005930)
  change: string; // 표시용 변화율/변동 텍스트
  up: boolean;    // true: 상승(빨강), false: 하락(파랑)
}
