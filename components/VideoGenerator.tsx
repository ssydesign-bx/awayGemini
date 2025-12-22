
import React, { useState, useRef } from 'react';
import { GeminiService } from '../services/geminiService';
import { GeneratedAsset, VideoConfig } from '../types';

interface VideoGeneratorProps {
  onKeyNeeded: () => void;
  hasKey: boolean;
  archive: GeneratedAsset[];
  onNewAsset: (asset: GeneratedAsset) => void;
}

const VideoGenerator: React.FC<VideoGeneratorProps> = ({ onKeyNeeded, hasKey, archive, onNewAsset }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [config, setConfig] = useState<VideoConfig>({
    resolution: '1080p',
    aspectRatio: '16:9'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setAttachedImages(prev => {
        if (prev.length >= 3) return prev;
        return [...prev, result];
      });
    };
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

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!hasKey) {
      onKeyNeeded();
      return;
    }
    if (!prompt.trim() && attachedImages.length === 0) return;
    setIsLoading(true);
    try {
      const url = await GeminiService.generateVideo(prompt, config, attachedImages, setStatusMsg);
      const newAsset: GeneratedAsset = {
        id: Date.now().toString(),
        type: 'video',
        url,
        prompt: prompt || "Motion Creation",
        timestamp: Date.now(),
        config: { ...config }
      };
      onNewAsset(newAsset);
      setAttachedImages([]);
    } catch (error: any) {
      console.error(error);
      alert("Video generation failed.");
    } finally {
      setIsLoading(false);
      setStatusMsg("");
    }
  };

  return (
    <div className="space-y-8 flex flex-col animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Video Engine</h2>
            <p className="text-xs text-gray-400 font-medium">Powered by Veo 3.1 & Motion Intelligence</p>
          </div>
          
          <div className="flex bg-gray-50 p-1 rounded-xl">
            {["720p", "1080p"].map(r => (
              <button key={r} onClick={() => setConfig(prev => ({ ...prev, resolution: r as any }))} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${config.resolution === r ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}>{r}</button>
            ))}
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {attachedImages.length > 0 && (
            <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              {attachedImages.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img src={img} className="h-24 w-24 object-cover rounded-xl border border-white shadow-sm transition-transform group-hover:scale-105" />
                  <button 
                    onClick={() => removeImage(idx)} 
                    className="absolute -top-2 -right-2 bg-gray-900 text-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              {attachedImages.length < 3 && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="h-24 w-24 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 hover:border-gray-300 hover:text-gray-400 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  <span className="text-[10px] font-bold mt-1">Add</span>
                </button>
              )}
            </div>
          )}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onPaste={handlePaste}
            placeholder="Add motion prompt or drop images to animate (Up to 3)..."
            className="w-full bg-gray-50 border border-transparent rounded-2xl px-6 py-4 text-base focus:outline-none focus:bg-white focus:border-gray-100 transition-all resize-none h-32 font-medium"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-4 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1h16v-1M4 12l8-8 8 8M12 4v12" /></svg>
            Add Reference Images
          </button>
          <button 
            onClick={handleGenerate}
            disabled={(!prompt.trim() && attachedImages.length === 0) || isLoading}
            className="flex-1 bg-gray-900 text-white rounded-xl font-bold py-4 hover:bg-black disabled:opacity-30 shadow-sm transition-all"
          >
            {isLoading ? statusMsg || "Generating..." : "Start Generation"}
          </button>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          multiple
          onChange={(e) => {
            const files = e.target.files;
            if (files) {
              // Fix: Explicitly type 'f' as 'File' to resolve 'unknown' to 'File' assignment error
              Array.from(files).forEach((f: File) => processFile(f));
            }
            e.target.value = '';
          }} 
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 mb-6 px-2">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Creations</h3>
          <div className="h-px flex-1 bg-gray-100"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12">
          {archive.map((asset) => (
            <div key={asset.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all">
              <video src={asset.url} className="w-full aspect-video object-cover" controls loop muted />
              <div className="p-5">
                <p className="text-gray-800 text-sm font-medium leading-relaxed italic">"{asset.prompt}"</p>
              </div>
            </div>
          ))}
          
          {archive.length === 0 && (
            <div className="col-span-full h-48 flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-2xl text-gray-300">
              <p className="font-semibold text-xs uppercase tracking-wider">No videos generated yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoGenerator;
