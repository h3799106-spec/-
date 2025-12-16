import React, { useState, useMemo, useEffect } from 'react';
import { VARIATIONS } from './constants';
import { GeneratedPhoto, ThemeId } from './types';
import { generateThemedImage } from './services/geminiService';
import { PhotoUploader } from './components/PhotoUploader';
import { ResultCard } from './components/ResultCard';
import { GalleryModal, GalleryImage } from './components/GalleryModal';

// Extend Window interface for AI Studio helpers
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}

const App: React.FC = () => {
  const [apiKeyReady, setApiKeyReady] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  
  // Custom Edit State
  const [customPrompt, setCustomPrompt] = useState('');
  const [results, setResults] = useState<GeneratedPhoto[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Gallery State
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);

  // Check for API Key on mount
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (hasKey) {
          setApiKeyReady(true);
        }
      } else {
        // Fallback if not running in the specific environment
        setApiKeyReady(true);
      }
    };
    checkKey();
  }, []);

  const handleConnectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setApiKeyReady(true);
      } catch (e) {
        console.error("Failed to select key", e);
      }
    }
  };

  // Derive gallery images from results
  const galleryImages: GalleryImage[] = useMemo(() => {
    const images: GalleryImage[] = [];
    results.forEach(r => {
      if (r.imageUrl) {
        const theme = VARIATIONS.find(t => t.id === r.themeId);
        if (theme) {
          images.push({
            id: r.themeId,
            url: r.imageUrl,
            title: theme.title,
            description: theme.description
          });
        }
      }
    });
    return images;
  }, [results]);

  const handleImageUpload = (base64Image: string) => {
    setOriginalImage(base64Image);
    setResults([]);
    setCustomPrompt('');
  };

  const handleGenerate = async () => {
    if (!originalImage || !customPrompt.trim() || isGenerating) return;

    setIsGenerating(true);

    // Initialize results placeholders
    const initialResults: GeneratedPhoto[] = VARIATIONS.map(v => ({
      themeId: v.id,
      imageUrl: null,
      isLoading: true,
      error: null
    }));
    setResults(initialResults);

    // Trigger generations concurrently
    VARIATIONS.forEach((variation, index) => {
       // Add entropy to prompt to ensure variations are distinct
       const uniqueSeed = index === 0 ? " . Make it artistic and vibrant." : " . Make it realistic and detailed.";
       processVariation(variation.id, customPrompt + uniqueSeed, originalImage);
    });
  };

  const processVariation = async (themeId: ThemeId, prompt: string, base64Image: string) => {
    try {
      const generatedImageBase64 = await generateThemedImage(base64Image, prompt);
      
      setResults(prev => prev.map(item => 
        item.themeId === themeId 
          ? { ...item, imageUrl: generatedImageBase64, isLoading: false }
          : item
      ));
    } catch (error) {
      console.error(`Error generating ${themeId}:`, error);
      setResults(prev => prev.map(item => 
        item.themeId === themeId 
          ? { ...item, isLoading: false, error: '生成失败' }
          : item
      ));
    } finally {
      // Check if all are done to stop loading state (optional visual cue)
      setResults(currentResults => {
        const allDone = currentResults.every(r => !r.isLoading);
        if (allDone) setIsGenerating(false);
        return currentResults;
      });
    }
  };

  const openGallery = (url: string) => {
    const idx = galleryImages.findIndex(img => img.url === url);
    if (idx !== -1) {
      setGalleryStartIndex(idx);
      setIsGalleryOpen(true);
    }
  };

  const handleImageUpdate = (id: string, newUrl: string) => {
    setResults(prev => prev.map(item => 
      item.themeId === id 
        ? { ...item, imageUrl: newUrl }
        : item
    ));
  };

  if (!apiKeyReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6 animate-fade-in">
           <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner">
             ✨
           </div>
           <div>
             <h1 className="text-2xl font-bold text-gray-900 font-fredoka">欢迎来到 MagicStudio</h1>
             <p className="text-gray-500 mt-2 leading-relaxed">
               为了生成专业的 8K 影楼级人像，本应用需要使用 Google Cloud API Key 并开启 <strong>Gemini</strong> 权限。
             </p>
           </div>
           <button
             onClick={handleConnectKey}
             className="w-full py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-200 transform hover:scale-[1.02]"
           >
             连接 API Key
           </button>
           <p className="text-xs text-gray-400">
             请选择已启用计费的项目。
             <br/>
             <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-indigo-500">
               了解更多关于计费的信息
             </a>
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">📸</span>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-600 font-fredoka">
              MagicStudio 魔法写真馆
            </h1>
          </div>
          {originalImage && (
            <button 
              onClick={() => {
                setOriginalImage(null);
                setResults([]);
                setCustomPrompt('');
                setIsGenerating(false);
              }}
              className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full"
            >
              重新开始
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {!originalImage ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-fade-in-up">
            <div className="text-center space-y-4 max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight font-fredoka">
                打造你的 <span className="text-indigo-600">专属写真</span>
              </h2>
              <p className="text-lg text-gray-600">
                上传照片，输入任意创意指令，AI 为你生成两组风格迥异的专业大片。
              </p>
            </div>
            <PhotoUploader onImageSelected={handleImageUpload} />
          </div>
        ) : (
          <div className="flex flex-col gap-8 animate-fade-in">
            {/* Input & Original Section */}
            <section className="bg-white rounded-3xl shadow-sm border border-indigo-50 overflow-hidden">
               <div className="flex flex-col lg:flex-row">
                 {/* Original Image Preview - Smaller on desktop */}
                 <div className="lg:w-1/4 bg-gray-50 p-6 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-gray-100">
                    <div className="relative group w-full max-w-[200px] aspect-[3/4] rounded-xl overflow-hidden shadow-md">
                      <img 
                        src={originalImage} 
                        alt="Original" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white font-medium text-sm">原图</span>
                      </div>
                    </div>
                 </div>

                 {/* Prompt Input Area */}
                 <div className="flex-1 p-6 lg:p-10 flex flex-col justify-center">
                   <h3 className="text-2xl font-bold mb-4 flex items-center font-fredoka text-gray-800">
                     <span className="mr-3 text-3xl">✨</span> 魔法指令
                   </h3>
                   <div className="relative">
                     <textarea
                       value={customPrompt}
                       onChange={(e) => setCustomPrompt(e.target.value)}
                       placeholder="描述你想要的画面... 例如：
• 在充满未来感的赛博朋克城市街道，穿着发光的机甲战衣
• 在莫奈风格的花园中，穿着优雅的白色复古长裙，阳光斑驳
• 变成皮克斯动画风格的3D角色，表情夸张可爱"
                       className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none h-32 text-gray-700 text-lg leading-relaxed shadow-inner"
                     />
                     <div className="mt-4 flex justify-end">
                       <button
                         onClick={handleGenerate}
                         disabled={!customPrompt.trim() || isGenerating}
                         className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg shadow-indigo-200 transform transition-all duration-200 flex items-center gap-2 ${
                           !customPrompt.trim() || isGenerating
                             ? 'bg-gray-300 cursor-not-allowed' 
                             : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105 active:scale-95'
                         }`}
                       >
                         {isGenerating ? (
                           <>
                             <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                             </svg>
                             生成中...
                           </>
                         ) : (
                           <>
                             <span>开始施法</span>
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                             </svg>
                           </>
                         )}
                       </button>
                     </div>
                   </div>
                 </div>
               </div>
            </section>

            {/* Results Section */}
            {(results.length > 0) && (
              <section>
                 <div className="flex items-center justify-between mb-6">
                   <h3 className="text-2xl font-bold text-gray-800 font-fredoka flex items-center gap-2">
                     <span>🎨</span> 生成结果
                   </h3>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {VARIATIONS.map((variation) => {
                     const result = results.find(r => r.themeId === variation.id);
                     return (
                       <div key={variation.id} className="h-[500px]">
                         <ResultCard
                           theme={variation}
                           result={result}
                           onClick={() => result?.imageUrl && openGallery(result.imageUrl)}
                         />
                       </div>
                     );
                   })}
                 </div>
              </section>
            )}
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="py-8 text-center text-gray-400 text-sm">
        <p>© {new Date().getFullYear()} MagicStudio AI. Powered by Gemini 2.5 Flash.</p>
      </footer>

      <GalleryModal 
        isOpen={isGalleryOpen}
        initialIndex={galleryStartIndex}
        images={galleryImages}
        onClose={() => setIsGalleryOpen(false)}
        onUpdateImage={handleImageUpdate}
      />
    </div>
  );
};

export default App;