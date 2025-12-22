
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
          if (prev < 40) { setStatusMsg("Analyzing..."); return prev + 3; }
          if (prev < 75) { setStatusMsg("Rendering..."); return prev + 2; }
          if (prev < 95) { setStatusMsg("Finishing..."); return prev + 0.5; }
          return prev;
        });
      }, 200);
    } else {
      if (progress < 100) setProgress(0);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const triggerAutoDownload = (url: string, id: string) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = `image-${id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.warn("Auto-download failed");
    }
  };

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Fix: Explicitly cast 'file' to 'File' to resolve 'unknown' to 'Blob' assignment error
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setAttachedImages(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
    // Reset input to allow same file selection
    e.target.value = '';
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
      setStatusMsg("Done!");
      setAttachedImages([]);
      setPrompt('');
      
    } catch (error: any) {
      console.error(error);
      if (error.message === "PAID_PROJECT_REQUIRED") {
        alert("Permission Denied: Gemini 3 Pro requires a Paid Billing Project API Key.");
      } else if (error.message === "AUTH_REQUIRED") {
        onKeyNeeded();
      } else {
        alert("Error: " + error.message);
      }
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 1000);
    }
  };

  return (
    <div className="space-y-8 flex flex-col animate-in fade-in duration-500">
      {/* Input Section */}
      <div className="bg-white p-6 md:p-10 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Image Studio</h2>
            <p className="text-xs text-gray-400 font-medium">Powered by Gemini Pro & Nano Engine</p>
          </div>
          
          <div className="flex bg-gray-50 p-1 rounded-xl">
            <button 
              onClick={() => setConfig(prev => ({ ...prev, quality: 'standard' }))}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${config.quality === 'standard' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-500'}`}
            >
              Standard
            </button>
            <button 
              onClick={() => setConfig(prev => ({ ...prev, quality: 'high' }))}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${config.quality === 'high' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-500'}`}
            >
              Pro
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-6">
            <div className="space-y-4">
              {attachedImages.length > 0 && (
                <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  {attachedImages.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img src={img} className="h-20 w-20 object-cover rounded-xl border border-white shadow-sm transition-transform group-hover:scale-105" />
                      <button 
                        onClick={() => removeImage(idx)} 
                        className="absolute -top-2 -right-2 bg-gray-900 text-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What do you want to create? Add references for more control."
                className="w-full bg-gray-50 border border-transparent rounded-2xl px-6 py-4 text-base focus:outline-none focus:bg-white focus:border-gray-200 transition-all resize-none h-32 font-medium"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-6 py-4 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1h16v-1M4 12l8-8 8 8M12 4v12" /></svg>
                Add References
              </button>
              
              <div className="flex-1 w-full relative">
                <button 
                  onClick={handleGenerate}
                  disabled={isLoading || !prompt.trim()}
                  className={`w-full py-4 rounded-xl font-bold transition-all shadow-sm relative overflow-hidden ${
                    config.quality === 'high' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-900 hover:bg-black'
                  } text-white disabled:opacity-50`}
                >
                  {isLoading && (
                    <div className="absolute inset-0 bg-white/10 transition-all duration-300" style={{ width: `${progress}%` }} />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>{statusMsg} {Math.round(progress)}%</>
                    ) : (
                      `Generate Image`
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="w-full lg:w-64 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Aspect Ratio</label>
              <div className="grid grid-cols-2 gap-2">
                {["1:1", "3:4", "4:3", "9:16", "16:9"].map(r => (
                  <button 
                    key={r} 
                    onClick={() => setConfig(prev => ({ ...prev, aspectRatio: r as any }))} 
                    className={`py-2 rounded-lg border text-[11px] font-bold transition-all ${config.aspectRatio === r ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {config.quality === 'high' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Resolution</label>
                <div className="grid grid-cols-3 gap-2">
                  {["1K", "2K", "4K"].map(sz => (
                    <button 
                      key={sz} 
                      onClick={() => setConfig(prev => ({ ...prev, imageSize: sz as any }))} 
                      className={`py-2 rounded-lg border text-[11px] font-bold transition-all ${config.imageSize === sz ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
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

      {/* Asset Grid */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-6 px-2">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Database</h3>
          <div className="h-px flex-1 bg-gray-100"></div>
          <span className="text-[10px] font-bold text-gray-400 uppercase">{archive.length} items</span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-12">
          {archive.map((asset) => (
            <div key={asset.id} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className="aspect-square relative overflow-hidden">
                <img src={asset.url} alt={asset.prompt} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                  <button onClick={() => triggerAutoDownload(asset.url, asset.id)} className="px-4 py-2 bg-white text-gray-900 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all">
                    Download
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {archive.length === 0 && (
            <div className="col-span-full h-48 flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-2xl text-gray-300">
              <p className="font-semibold text-xs uppercase tracking-wider">No assets generated yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;
