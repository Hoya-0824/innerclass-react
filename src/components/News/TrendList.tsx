import React from 'react';
import type { TrendItem } from '../../data/newsMockData';

interface TrendListProps {
    items: TrendItem[];
}

const TrendList: React.FC<TrendListProps> = ({ items }) => {
    return (
        <div className="flex flex-col gap-3">
            {items.map((item) => (
                <div
                    key={item.id}
                    className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
                >
                    <div className="flex-shrink-0 w-24 md:w-28 text-center mr-4">
                        <span className="block bg-gray-200 text-gray-700 text-xs font-bold px-2 py-1 rounded">
                            {item.label}
                        </span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {item.title}
                        </h4>
                    </div>

                    <div className="ml-4 flex-shrink-0 text-xs text-gray-400">
                        {item.date}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TrendList;
