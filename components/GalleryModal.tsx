import React, { useState, useEffect, useCallback, useRef } from 'react';

export interface GalleryImage {
  id: string;
  url: string;
  title: string;
  description: string;
}

interface GalleryModalProps {
  isOpen: boolean;
  initialIndex: number;
  images: GalleryImage[];
  onClose: () => void;
  onUpdateImage: (id: string, newUrl: string) => void;
}

const FILTERS = [
  { name: '原图', value: 'none' },
  { name: '鲜艳', value: 'saturate(1.5) contrast(1.1)' },
  { name: '黑白', value: 'grayscale(100%)' },
  { name: '暖色', value: 'sepia(0.4) saturate(1.4) hue-rotate(-20deg)' },
  { name: '冷色', value: 'hue-rotate(30deg) saturate(0.8) contrast(1.1)' },
  { name: '复古', value: 'sepia(0.6) contrast(1.2) brightness(0.9)' },
];

export const GalleryModal: React.FC<GalleryModalProps> = ({ 
  isOpen, 
  initialIndex, 
  images, 
  onClose,
  onUpdateImage 
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editState, setEditState] = useState({
    filter: 'none',
    rotate: 0,
    flip: false
  });
  const [isSaving, setIsSaving] = useState(false);

  // Zoom & Pan State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = useRef(false);
  const touchStartRef = useRef<number | null>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Reset states on slide change
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
    resetEdits();
    setIsEditing(false);
  }, [currentIndex]);

  const resetEdits = () => {
    setEditState({ filter: 'none', rotate: 0, flip: false });
  };

  const handleNext = useCallback(() => {
    if (isEditing) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length, isEditing]);

  const handlePrev = useCallback(() => {
    if (isEditing) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length, isEditing]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      if (isEditing) setIsEditing(false);
      else onClose();
    }
    // Only navigate with arrows if not zoomed and not editing
    if (scale === 1 && !isEditing) {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    }
  }, [isOpen, onClose, handleNext, handlePrev, scale, isEditing]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // --- Zoom Logic ---
  const toggleZoom = () => {
    if (isEditing) return;
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2.5); // 2.5x Zoom
    }
  };

  // --- Pan Logic ---
  const handlePointerDown = (e: React.PointerEvent) => {
    hasMovedRef.current = false;
    if (scale > 1 && !isEditing) {
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = { 
        x: e.clientX - position.x, 
        y: e.clientY - position.y 
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (scale > 1 && isDragging && dragStartRef.current && !isEditing) {
      e.preventDefault();
      hasMovedRef.current = true;
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      setPosition({ x: newX, y: newY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      dragStartRef.current = null;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasMovedRef.current && !isEditing) {
      toggleZoom();
    }
    hasMovedRef.current = false;
  };

  // --- Swipe Navigation Logic ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale > 1 || isEditing) return;
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (scale > 1 || touchStartRef.current === null || isEditing) return;
    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchStartRef.current - touchEnd;
    const minSwipeDistance = 50;

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) handleNext();
      else handlePrev();
    }
    touchStartRef.current = null;
  };

  // --- Editing Logic ---
  const handleSaveEdit = async () => {
    setIsSaving(true);
    const image = images[currentIndex];
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image.url;

    try {
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Determine canvas size based on rotation
      const isRotated90 = editState.rotate % 180 !== 0;
      canvas.width = isRotated90 ? img.height : img.width;
      canvas.height = isRotated90 ? img.width : img.height;

      // Apply Filter
      ctx.filter = editState.filter;

      // Transform context to center
      ctx.translate(canvas.width / 2, canvas.height / 2);

      // Rotate
      ctx.rotate((editState.rotate * Math.PI) / 180);

      // Flip (scale x by -1)
      ctx.scale(editState.flip ? -1 : 1, 1);

      // Draw image centered
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      const newUrl = canvas.toDataURL('image/png');
      onUpdateImage(image.id, newUrl);
      setIsEditing(false);
      resetEdits();
    } catch (error) {
      console.error('Failed to save edit', error);
      alert('保存失败。');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in overflow-hidden"
      onClick={isEditing ? undefined : onClose}
    >
      {/* Controls Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 pointer-events-none">
        {/* Left Side: Close or Cancel */}
        <button
          onClick={isEditing ? () => setIsEditing(false) : onClose}
          className="pointer-events-auto text-white/70 hover:text-white p-2 bg-black/40 rounded-full transition-colors hover:bg-black/60 flex items-center gap-2"
        >
          {isEditing ? (
             <span className="px-2 text-sm font-semibold">取消</span>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </button>

        {/* Right Side: Tools or Save */}
        <div className="pointer-events-auto flex space-x-3">
          {isEditing ? (
             <button
               onClick={handleSaveEdit}
               disabled={isSaving}
               className="bg-indigo-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-lg flex items-center"
             >
               {isSaving ? (
                 <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
               ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                 </svg>
               )}
               保存
             </button>
          ) : (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); setScale(1); setPosition({x:0,y:0}); }}
                className="p-3 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors backdrop-blur-sm"
                title="编辑图片"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                 </svg>
              </button>
              <button 
                  onClick={(e) => { e.stopPropagation(); toggleZoom(); }}
                  className="p-3 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors backdrop-blur-sm"
                  title={scale > 1 ? "缩小" : "放大"}
              >
                 {scale > 1 ? (
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                   </svg>
                 ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                   </svg>
                 )}
              </button>
              <a
                href={currentImage.url}
                download={`magic-kids-${currentImage.title.toLowerCase().replace(/\s+/g, '-')}.png`}
                className="p-3 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
                title="下载"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
            </>
          )}
        </div>
      </div>

      {/* Main Image Area */}
      <div 
        className="w-full h-full flex items-center justify-center p-4 md:p-12"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative overflow-hidden shadow-2xl transition-all duration-300">
           <img
             src={currentImage.url}
             alt={currentImage.title}
             className={`max-h-[85vh] max-w-full object-contain transition-transform duration-200 ease-out select-none touch-none ${!isEditing && 'cursor-grab active:cursor-grabbing'}`}
             style={{
               transform: isEditing 
                  ? `rotate(${editState.rotate}deg) scaleX(${editState.flip ? -1 : 1})`
                  : `translate(${position.x}px, ${position.y}px) scale(${scale})`,
               filter: isEditing ? editState.filter : undefined
             }}
             onClick={handleImageClick}
             draggable={false}
           />
        </div>
      </div>

      {/* Navigation Arrows (Not visible during edit or zoom) */}
      {!isEditing && scale === 1 && (
        <>
          <button 
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            className="absolute left-4 p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all hidden md:block"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="absolute right-4 p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all hidden md:block"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Editing Toolbar */}
      {isEditing && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md border-t border-white/10 p-4 pb-8 z-50 flex flex-col gap-4 animate-fade-in-up">
           {/* Transforms */}
           <div className="flex justify-center space-x-6">
             <button 
               onClick={() => setEditState(p => ({ ...p, rotate: p.rotate - 90 }))}
               className="flex flex-col items-center text-white/70 hover:text-indigo-400 gap-1"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
               </svg>
               <span className="text-[10px] uppercase tracking-wider">旋转</span>
             </button>
             <button 
               onClick={() => setEditState(p => ({ ...p, flip: !p.flip }))}
               className="flex flex-col items-center text-white/70 hover:text-indigo-400 gap-1"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
               </svg>
               <span className="text-[10px] uppercase tracking-wider">翻转</span>
             </button>
           </div>
           
           {/* Filters */}
           <div className="flex overflow-x-auto space-x-4 pb-2 px-4 no-scrollbar justify-start md:justify-center">
             {FILTERS.map(f => (
               <button
                 key={f.name}
                 onClick={() => setEditState(p => ({ ...p, filter: f.value }))}
                 className={`flex flex-col items-center flex-shrink-0 group`}
               >
                 <div className={`w-14 h-14 rounded-md overflow-hidden border-2 mb-1 transition-all ${editState.filter === f.value ? 'border-indigo-500 scale-110' : 'border-transparent opacity-70 group-hover:opacity-100'}`}>
                    <img 
                      src={currentImage.url} 
                      className="w-full h-full object-cover" 
                      style={{ filter: f.value }}
                      alt={f.name}
                    />
                 </div>
                 <span className={`text-[10px] uppercase font-medium tracking-wider ${editState.filter === f.value ? 'text-indigo-400' : 'text-white/60'}`}>
                   {f.name}
                 </span>
               </button>
             ))}
           </div>
        </div>
      )}

      {/* Image Info (Not visible during edit) */}
      {!isEditing && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 pb-8 text-center md:text-left pointer-events-none">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end gap-4">
            <div className="text-white">
              <h3 className="text-2xl font-bold font-fredoka">{currentImage.title}</h3>
              <p className="text-white/80 font-light max-w-xl">{currentImage.description}</p>
            </div>
            <div className="text-white/50 text-sm font-mono">
              {currentIndex + 1} / {images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};