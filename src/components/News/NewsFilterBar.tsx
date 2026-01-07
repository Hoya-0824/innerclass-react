import React from 'react';

interface NewsFilterBarProps {
    activeFilter: 'all' | 'domestic' | 'international';
    onFilterChange: (filter: 'all' | 'domestic' | 'international') => void;
}

const filterOptions: { key: 'all' | 'domestic' | 'international'; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'domestic', label: '국내' },
    { key: 'international', label: '해외' },
];

const NewsFilterBar: React.FC<NewsFilterBarProps> = ({ activeFilter, onFilterChange }) => {
    return (
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            {/* Filter Tabs */}
            <div className="flex bg-white border border-gray-300 rounded-lg overflow-hidden p-1 shadow-sm w-full md:w-auto">
                {filterOptions.map((filter) => (
                    <button
                        key={filter.key}
                        onClick={() => onFilterChange(filter.key)}
                        className={`flex-1 md:flex-none px-6 py-2 text-sm font-medium rounded-md transition-all duration-200 ${activeFilter === filter.key
                            ? 'bg-gray-800 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>


            {/* Search Bar */}
            <div className="relative w-full md:max-w-md">
                <input
                    type="text"
                    placeholder="내 주식에 맞는 뉴스 찾아줘"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-200 border-none rounded-full text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all shadow-inner"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default NewsFilterBar;
