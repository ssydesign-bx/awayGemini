
import React, { useState, useRef, useEffect } from 'react';
import { GeminiService } from '../services/geminiService';
import { GeneratedAsset, ImageConfig } from '../types';

interface ImageGeneratorProps {
  onKeyNeeded: () => void;
  hasKey: boolean;
  archive: GeneratedAsset[];
  onNewAsset: (asset: GeneratedAsset) => void;
}

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ onKeyNeeded, hasKey, archive, onNewAsset }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [config, setConfig] = useState<ImageConfig>({
    quality: 'high',
    aspectRatio: '1:1',
    imageSize: '1K'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      setProgress(5);
      setStatusMsg("Starting generation...");
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev < 40) { setStatusMsg("Analyzing prompt..."); return prev + 3; }
          if (prev < 75) { setStatusMsg("Rendering details..."); return prev + 2; }
          if (prev < 95) { setStatusMsg(config.imageSize !== '1K' ? "Stabilizing Hi-Res (Wait)..." : "Finalizing..."); return prev + 0.5; }
          return prev;
        });
      }, 200);
    } else {
      if (progress < 100) setProgress(0);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isLoading, config.imageSize]);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setAttachedImages(prev => [...prev, result]);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: File) => processFile(file));
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) processFile(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file: File) => processFile(file));
    }
  };

  const triggerAutoDownload = (url: string, id: string) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = `ssy-design-${id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.warn("Auto-download failed");
    }
  };

  const handleCopyPrompt = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;
    
    setIsLoading(true);
    setProgress(5);
    try {
      const url = await GeminiService.generateImage(prompt, config, attachedImages);
      
      const newAsset: GeneratedAsset = {
        id: Date.now().toString(),
        type: 'image',
        url,
        prompt,
        timestamp: Date.now(),
        config: { ...config }
      };

      onNewAsset(newAsset);
      triggerAutoDownload(url, newAsset.id);
      
      setProgress(100);
      setStatusMsg("Complete!");
      setAttachedImages([]);
      setPrompt('');
      
    } catch (error: any) {
      console.error("Generator Error:", error);
      const msg = error.message || "";

      if (msg === "PAID_PROJECT_REQUIRED") {
        alert("Paid Key Required: 2K/4K resolution requires a Gemini API key from a Paid Billing Project.");
      } else if (msg === "RESELECT_KEY_REQUIRED" || msg === "AUTH_REQUIRED") {
        onKeyNeeded();
      } else if (msg.startsWith("QUOTA_EXCEEDED")) {
        const timeDetail = msg.includes("(") ? msg.match(/\((.*?)\)/)?.[1] : null;
        const displayTime = timeDetail ? ` [${timeDetail}]` : "";
        alert(`Rate Limit Reached: Your API quota for high-res images has been exhausted.${displayTime}\n\nPlease wait a moment and try again.`);
      } else if (msg === "API_SERVER_ERROR") {
        alert("Server Busy: Google's 2K/4K engine is currently overloaded. This is common during peak times. Please try again in 10-20 seconds or use 1K for immediate results.");
      } else if (msg.startsWith("SYSTEM_ERROR:")) {
        alert(`Engine Error: ${msg.replace("SYSTEM_ERROR: ", "")}\n\nNote: 2K/4K resolution is very resource-intensive for Google's servers and may fail unexpectedly. Switching to 1K is recommended if this persists.`);
      } else {
        alert("An unexpected error occurred. Hi-res generation can be unstable; please try 1K if you keep seeing this.");
      }
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 800);
    }
  };

  return (
    <div className="space-y-8 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Input Section */}
      <div 
        className={`bg-white p-6 md:p-10 rounded-[40px] border transition-all duration-500 shadow-sm relative overflow-hidden ${
          isDragging ? 'border-blue-500 ring-8 ring-blue-50 bg-blue-50/10' : 'border-gray-100'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Image Studio</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Gemini 3 Pro Creative Engine</p>
          </div>
          
          <div className="flex bg-gray-100 p-1.5 rounded-2xl">
            <button 
              onClick={() => setConfig(prev => ({ ...prev, quality: 'standard' }))}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${config.quality === 'standard' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-500'}`}
            >
              FLASH
            </button>
            <button 
              onClick={() => setConfig(prev => ({ ...prev, quality: 'high' }))}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${config.quality === 'high' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-500'}`}
            >
              PRO 3.0
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1 space-y-8">
            <div className="relative group">
              {attachedImages.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 animate-in fade-in zoom-in duration-300">
                  {attachedImages.map((img, idx) => (
                    <div key={idx} className="relative group/img">
                      <img src={img} className="h-20 w-20 object-cover rounded-xl border-2 border-white shadow-md transition-transform group-hover/img:scale-105" />
                      <button 
                        onClick={() => removeImage(idx)} 
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                      >
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onPaste={handlePaste}
                placeholder="Describe your creative vision in detail... 2K/4K resolution is experimental and may require retries."
                className="w-full bg-gray-50 border-2 border-transparent rounded-[24px] px-8 py-6 text-base focus:outline-none focus:bg-white focus:border-gray-200 transition-all resize-y min-h-[160px] font-normal leading-relaxed placeholder:text-gray-300"
              />
              
              {isDragging && (
                <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-[2px] rounded-[24px] flex items-center justify-center pointer-events-none border-2 border-dashed border-blue-400">
                  <div className="bg-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3">
                    <svg className="w-5 h-5 text-blue-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1h16v-1M4 12l8-8 8 8M12 4v12" /></svg>
                    <span className="text-blue-600 font-black text-sm uppercase">Drop images to add as reference</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-gray-100 text-gray-500 rounded-2xl text-sm font-black hover:border-gray-300 hover:text-gray-900 transition-all flex items-center justify-center gap-2 group"
              >
                <svg className="w-4 h-4 transition-transform group-hover:-translate-y-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1h16v-1M4 12l8-8 8 8M12 4v12" /></svg>
                REF IMAGES
              </button>
              
              <div className="flex-1 w-full relative">
                <button 
                  onClick={handleGenerate}
                  disabled={isLoading || !prompt.trim()}
                  className={`w-full py-4 rounded-2xl font-black text-sm tracking-widest transition-all shadow-xl relative overflow-hidden group ${
                    config.quality === 'high' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-gray-900 hover:bg-black shadow-gray-200'
                  } text-white disabled:opacity-30`}
                >
                  {isLoading && (
                    <div className="absolute inset-0 bg-white/20 transition-all duration-300" style={{ width: `${progress}%` }} />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    {isLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {statusMsg}
                      </>
                    ) : (
                      "GENERATE CREATIVE"
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="w-full lg:w-72 space-y-10">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Aspect Ratio</label>
              <div className="grid grid-cols-2 gap-3">
                {["1:1", "3:4", "4:3", "9:16", "16:9"].map(r => (
                  <button 
                    key={r} 
                    onClick={() => setConfig(prev => ({ ...prev, aspectRatio: r as any }))} 
                    className={`py-3 rounded-xl border-2 text-xs font-black transition-all ${config.aspectRatio === r ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {config.quality === 'high' && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="flex justify-between items-center ml-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Resolution</label>
                   {config.imageSize !== '1K' && <span className="text-[9px] font-black text-blue-500 animate-pulse uppercase tracking-tighter">PREVIEW STAGE</span>}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {["1K", "2K", "4K"].map(sz => (
                    <button 
                      key={sz} 
                      onClick={() => setConfig(prev => ({ ...prev, imageSize: sz as any }))} 
                      className={`py-3 rounded-xl border-2 text-xs font-black transition-all ${config.imageSize === sz ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'}`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
                {config.imageSize !== '1K' && (
                  <p className="text-[9px] text-gray-400 font-medium px-2 leading-tight">
                    * Hi-res models have strict quotas. If it fails, the system will tell you exactly how long to wait.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          multiple
          onChange={handleFileChange} 
        />
      </div>

      {/* Gallery Section */}
      <div className="flex-1 flex flex-col pt-4">
        <div className="flex items-center gap-4 mb-8 px-4">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.3em]">Project Assets</h3>
          <div className="h-px flex-1 bg-gray-200/60"></div>
          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{archive.length} CREATIONS</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-20">
          {archive.map((asset) => (
            <div key={asset.id} className="group bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 flex flex-col">
              <div className="aspect-square relative overflow-hidden bg-gray-50 border-b border-gray-50">
                <img src={asset.url} alt={asset.prompt} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter shadow-sm ${asset.config?.quality === 'high' ? 'bg-blue-600 text-white' : 'bg-gray-900 text-white'}`}>
                    {asset.config?.quality === 'high' ? 'PRO 3.0' : 'FLASH'}
                  </span>
                  {asset.config?.imageSize && (
                    <span className="bg-white/90 backdrop-blur px-2.5 py-1 rounded-lg text-[9px] font-black text-gray-900 uppercase tracking-tighter shadow-sm w-fit">
                      {asset.config.imageSize} RES
                    </span>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                  <button onClick={() => triggerAutoDownload(asset.url, asset.id)} className="px-6 py-3 bg-white text-gray-900 rounded-2xl text-xs font-black hover:bg-gray-100 transition-all active:scale-95 shadow-2xl flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1h16v-1M4 12l8-8 8 8M12 4v12" /></svg>
                    DOWNLOAD
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Prompt Details</span>
                    <button onClick={() => handleCopyPrompt(asset.prompt, asset.id)} className={`p-1.5 rounded-lg transition-all ${copiedId === asset.id ? 'bg-lime-50 text-lime-600' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'}`}>
                      {copiedId === asset.id ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>}
                    </button>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-gray-700 text-xs font-normal leading-relaxed tracking-tight line-clamp-3">{asset.prompt}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;
