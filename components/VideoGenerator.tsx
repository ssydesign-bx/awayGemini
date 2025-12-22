
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
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [config, setConfig] = useState<VideoConfig>({
    resolution: '1080p',
    aspectRatio: '16:9'
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
    if (!hasKey) {
      onKeyNeeded();
      return;
    }
    if (!prompt.trim() && !attachedImage) return;
    setIsLoading(true);
    try {
      const url = await GeminiService.generateVideo(prompt, config, attachedImage || undefined, setStatusMsg);
      const newAsset: GeneratedAsset = {
        id: Date.now().toString(),
        type: 'video',
        url,
        prompt: prompt || "Image to Video",
        timestamp: Date.now(),
        config: { ...config }
      };
      onNewAsset(newAsset);
      setAttachedImage(null);
    } catch (error: any) {
      console.error(error);
      alert("Video generation failed.");
    } finally {
      setIsLoading(false);
      setStatusMsg("");
    }
  };

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 shrink-0">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Veo Video Studio</h2>
          <div className="flex gap-2">
            <div className="flex bg-gray-100 p-1 rounded-xl">
              {["720p", "1080p"].map(r => (
                <button key={r} onClick={() => setConfig(prev => ({ ...prev, resolution: r as any }))} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${config.resolution === r ? 'bg-white shadow-sm text-lime-600' : 'text-gray-500'}`}>{r}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {attachedImage && (
            <div className="relative shrink-0">
              <img src={attachedImage} className="h-24 w-24 object-cover rounded-xl border-2 border-lime-500" />
              <button onClick={() => setAttachedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onPaste={handlePaste}
            placeholder="Add motion prompt or paste image to animate (Ctrl+V)..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-lime-500/10 transition-all resize-none h-24"
          />
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Animate Image
          </button>
          <button 
            onClick={handleGenerate}
            disabled={(!prompt.trim() && !attachedImage) || isLoading}
            className="flex-1 bg-lime-500 text-white rounded-xl font-bold hover:bg-lime-600 disabled:opacity-50 shadow-lg shadow-lime-500/20 transition-all"
          >
            {isLoading ? statusMsg || "Processing..." : "Generate Motion"}
          </button>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8">
          {archive.map((asset) => (
            <div key={asset.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-md">
              <video src={asset.url} className="w-full aspect-video object-cover" controls loop muted />
              <div className="p-4"><p className="text-gray-800 text-sm font-medium">"{asset.prompt}"</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VideoGenerator;
