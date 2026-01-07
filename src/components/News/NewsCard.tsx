import React from 'react';
import type { NewsItem } from '../../data/newsMockData';

interface NewsCardProps {
    item: NewsItem;
    onClick?: () => void;
}

const NewsCard: React.FC<NewsCardProps> = ({ item, onClick }) => {
    return (
        <div
            className="bg-white border text-left border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col h-full cursor-pointer"
            onClick={onClick}
        >
            {/* Image Placeholder */}
            {/* Image Placeholder or Actual Image */}
            <div className="h-40 bg-gray-100 flex items-center justify-center relative overflow-hidden">
                {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-gray-400 text-sm font-medium">이미지</span>
                )}
            </div>

            <div className="p-5 flex flex-col flex-1">
                <h3 className="font-bold text-lg mb-1 line-clamp-2 leading-tight text-gray-900 border-none">
                    {item.title}
                </h3>
                <span className="text-xs text-gray-400 mb-3 block">{item.date}</span>

                <p className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed flex-1">
                    {item.summary}
                </p>

                <div className="flex flex-wrap gap-2 mt-auto">
                    {item.tags?.map((tag, idx) => (
                        <span
                            key={idx}
                            className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-md hover:bg-gray-200 transition-colors cursor-pointer font-medium"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        </div >
    );
};

export default NewsCard;
