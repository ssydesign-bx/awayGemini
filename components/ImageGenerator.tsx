
import React, { useState, useRef } from 'react';
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
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [config, setConfig] = useState<ImageConfig>({
    quality: 'standard',
    aspectRatio: '1:1',
    imageSize: '1K'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => setAttachedImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) processFile(blob);
      }
    }
  };

  const handleGenerate = async () => {
    // API 키가 없는 경우 버튼 클릭 시 키 선택 유도
    if (!hasKey) {
      onKeyNeeded();
      return;
    }
    
    if (!prompt.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const url = await GeminiService.generateImage(prompt, config, attachedImage || undefined);
      const newAsset: GeneratedAsset = {
        id: Date.now().toString(),
        type: 'image',
        url,
        prompt,
        timestamp: Date.now(),
        config: { ...config }
      };
      onNewAsset(newAsset);
      setAttachedImage(null);
    } catch (error: any) {
      console.error(error);
      alert("Image generation failed: " + (error.message || "Internal Error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-gray-900">Image Studio (Multi-modal)</h2>
          <div className="flex bg-gray-100 p-1 rounded-xl">
            {["standard", "high"].map(q => (
              <button 
                key={q}
                onClick={() => setConfig(prev => ({ ...prev, quality: q as any }))}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${config.quality === q ? 'bg-white shadow-sm text-lime-600' : 'text-gray-500'}`}
              >
                {q === 'high' ? 'NanoBanana Pro' : 'Standard'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <div className="flex-1 space-y-4">
             <div className="flex gap-2">
              {attachedImage && (
                <div className="relative shrink-0">
                  <img src={attachedImage} className="h-20 w-20 object-cover rounded-xl border-2 border-lime-500" />
                  <button onClick={() => setAttachedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-lg">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onPaste={handlePaste}
                placeholder="Describe what to create or paste image to edit..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-lime-500/10 transition-all resize-none h-20"
              />
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {attachedImage ? "Change Reference" : "Add Image (Edit Mode)"}
              </button>
              <button 
                onClick={handleGenerate}
                disabled={isLoading}
                className={`flex-1 py-2 rounded-xl font-bold transition-all shadow-lg ${
                  !prompt.trim() && !attachedImage
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-lime-500 text-white hover:bg-lime-600 active:scale-95'
                }`}
              >
                {isLoading ? "Generating..." : attachedImage ? "Apply Edits" : "Generate Image"}
              </button>
            </div>
          </div>
          
          <div className="w-full md:w-64 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aspect Ratio</label>
              <div className="grid grid-cols-3 gap-2">
                {["1:1", "3:4", "4:3", "9:16", "16:9"].map(r => (
                  <button key={r} onClick={() => setConfig(prev => ({ ...prev, aspectRatio: r as any }))} className={`py-1 rounded-lg border text-[10px] font-bold ${config.aspectRatio === r ? 'border-lime-500 bg-lime-50 text-lime-700' : 'border-gray-200 text-gray-600'}`}>{r}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
          {archive.map((asset) => (
            <div key={asset.id} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all">
              <div className="aspect-square bg-gray-100 relative overflow-hidden">
                <img src={asset.url} alt={asset.prompt} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button onClick={() => { const l=document.createElement('a'); l.href=asset.url; l.download=`img-${asset.id}.png`; l.click(); }} className="px-5 py-2 bg-white text-gray-900 rounded-xl font-bold shadow-xl">Download</button>
                </div>
              </div>
              <div className="p-4"><p className="text-xs text-gray-600 line-clamp-2 italic">"{asset.prompt}"</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;
