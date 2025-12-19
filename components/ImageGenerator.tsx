
import React, { useState } from 'react';
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
  const [config, setConfig] = useState<ImageConfig>({
    quality: 'standard',
    aspectRatio: '1:1',
    imageSize: '1K'
  });

  const handleGenerate = async () => {
    if (config.quality === 'high' && !hasKey) {
      onKeyNeeded();
      return;
    }
    if (!prompt.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const url = await GeminiService.generateImage(prompt, config);
      const newAsset: GeneratedAsset = {
        id: Date.now().toString(),
        type: 'image',
        url,
        prompt,
        timestamp: Date.now(),
        config: { ...config }
      };
      onNewAsset(newAsset);
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes("Requested entity was not found.")) {
        onKeyNeeded();
      } else {
        alert("Image generation failed.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-gray-900">Image Generation Studio</h2>
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setConfig(prev => ({ ...prev, quality: 'standard' }))}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${config.quality === 'standard' ? 'bg-white shadow-sm text-lime-600' : 'text-gray-500'}`}
            >
              Standard
            </button>
            <button 
              onClick={() => setConfig(prev => ({ ...prev, quality: 'high' }))}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${config.quality === 'high' ? 'bg-white shadow-sm text-lime-600' : 'text-gray-500'}`}
            >
              NanoBanana Pro
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aspect Ratio</label>
            <div className="flex flex-wrap gap-2">
              {["1:1", "3:4", "4:3", "9:16", "16:9"].map(r => (
                <button
                  key={r}
                  onClick={() => setConfig(prev => ({ ...prev, aspectRatio: r as any }))}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${config.aspectRatio === r ? 'border-lime-500 bg-lime-50 text-lime-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {config.quality === 'high' && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resolution</label>
              <div className="flex gap-2">
                {["1K", "2K", "4K"].map(s => (
                  <button
                    key={s}
                    onClick={() => setConfig(prev => ({ ...prev, imageSize: s as any }))}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${config.imageSize === s ? 'border-lime-500 bg-lime-50 text-lime-700' : 'border-gray-200 text-gray-600'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A cinematic shot of a futuristic metropolis..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-lime-500/10 transition-all resize-none h-20"
          />
          <button 
            onClick={handleGenerate}
            disabled={!prompt.trim() || isLoading}
            className="bg-lime-500 text-white px-8 rounded-xl font-bold hover:bg-lime-600 disabled:opacity-50 shadow-lg shadow-lime-500/20 transition-all flex items-center justify-center shrink-0"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : "Generate"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
          {archive.map((asset) => (
            <div key={asset.id} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all">
              <div className="aspect-square bg-gray-100 relative overflow-hidden flex items-center justify-center">
                <img src={asset.url} alt={asset.prompt} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                  <button 
                    onClick={() => downloadImage(asset.url, `studio-img-${asset.id}.png`)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 rounded-xl font-bold hover:scale-105 transition-transform shadow-xl"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                </div>
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase backdrop-blur-md">
                    {asset.config?.aspectRatio}
                  </span>
                  {asset.config?.imageSize && (
                    <span className="bg-lime-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                      {asset.config?.imageSize}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-600 line-clamp-2 italic">"{asset.prompt}"</p>
                <div className="mt-2 text-[10px] text-gray-400 font-medium">
                  {new Date(asset.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
          {archive.length === 0 && !isLoading && (
            <div className="col-span-full py-20 text-center text-gray-400 bg-white rounded-2xl border-2 border-dashed border-gray-100">
              <p>Your generated images will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;
