import React from 'react';
import { GeneratedPhoto, PhotoTheme } from '../types';

interface ResultCardProps {
  theme: PhotoTheme;
  result?: GeneratedPhoto;
  onClick?: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ theme, result, onClick }) => {
  const isLoading = result?.isLoading;
  const imageUrl = result?.imageUrl;
  const error = result?.error;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `magickids-${theme.id.toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div 
      className={`bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col h-full transform transition-all duration-300 hover:shadow-xl ${imageUrl ? 'cursor-pointer hover:-translate-y-1' : ''}`}
      onClick={imageUrl ? onClick : undefined}
    >
      {/* Image Area */}
      <div className="relative aspect-[3/4] bg-gray-100 w-full group overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 w-full h-full">
            {/* Shimmer Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-[shimmer_1.5s_infinite] bg-[length:200%_100%]"></div>
            
            {/* Floating Icon */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
               <div className="relative">
                 <div className="w-16 h-16 bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center animate-bounce shadow-sm">
                   <span className="text-3xl">{theme.icon}</span>
                 </div>
                 <div className="absolute -top-1 -right-1">
                   <span className="flex h-3 w-3">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                   </span>
                 </div>
               </div>
               <p className="mt-4 text-sm font-semibold text-gray-500 tracking-wide animate-pulse">正在施展魔法...</p>
            </div>
            
            {/* CSS for Shimmer Keyframes defined inline or in global CSS */}
            <style>{`
              @keyframes shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
            `}</style>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-red-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-600 font-medium">生成失败</p>
            <p className="text-xs text-red-400 mt-1">请重试</p>
          </div>
        ) : imageUrl ? (
          <>
            <img 
              src={imageUrl} 
              alt={theme.title} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            
            {/* Zoom Icon Hint */}
            <div className="absolute top-3 right-3 bg-black/30 backdrop-blur-sm p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
               </svg>
            </div>

            {/* Overlay Actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-end justify-center pb-6 opacity-0 group-hover:opacity-100">
              <button 
                onClick={handleDownload}
                className="bg-white text-gray-800 px-4 py-2 rounded-full font-semibold shadow-lg hover:bg-indigo-50 transform hover:scale-105 transition-all flex items-center space-x-2 z-10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>下载照片</span>
              </button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
            <span className="text-4xl mb-2">{theme.icon}</span>
            <span className="text-sm">等待上传...</span>
          </div>
        )}
      </div>

      {/* Info Area */}
      <div className="p-4 border-t border-gray-100 bg-white">
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-xl">{theme.icon}</span>
          <h3 className="font-bold text-gray-800">{theme.title}</h3>
        </div>
        <p className="text-xs text-gray-500">{theme.description}</p>
      </div>
    </div>
  );
};