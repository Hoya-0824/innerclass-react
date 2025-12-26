export interface TickerItem {
    name: string;
    value: string;
    change: string;
    up: boolean; // true: 상승(빨강), false: 하락(파랑)
}