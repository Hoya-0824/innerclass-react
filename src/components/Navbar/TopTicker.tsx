import { STOCK_DATA } from '../../data/mockData';

import type { TickerItem } from '../../types/stock';

const TopTicker = () => {
  return (
    <div className="w-full bg-white border-b border-gray-200 py-2 text-[13px]">
      <div className="max-w-[1200px] mx-auto flex overflow-hidden">
        <div className="flex animate-ticker w-max hover:[animation-play-state:paused] whitespace-nowrap">
          {[...STOCK_DATA, ...STOCK_DATA].map((item: TickerItem, index: number) => (
            <div key={index} className="flex items-center gap-1.5 mx-4">
              <span className="text-gray-500">{item.name}</span>
              <span className="font-bold">{item.value}</span>
              <span className={`text-xs ${item.up ? 'text-mkRed' : 'text-mkBlue'}`}>
                {item.up ? '▲' : '▼'} {item.change}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TopTicker;