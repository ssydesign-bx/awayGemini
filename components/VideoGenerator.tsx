
import React, { useState } from 'react';
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
  const [config, setConfig] = useState<VideoConfig>({
    resolution: '1080p',
    aspectRatio: '16:9'
  });

  const handleGenerate = async () => {
    if (!hasKey) {
      onKeyNeeded();
      return;
    }
    if (!prompt.trim() || isLoading) return;
    
    setIsLoading(true);
    setStatusMsg("Starting Veo Engine...");

    try {
      const url = await GeminiService.generateVideo(prompt, config, setStatusMsg);
      const newAsset: GeneratedAsset = {
        id: Date.now().toString(),
        type: 'video',
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
        alert("Video generation failed.");
      }
    } finally {
      setIsLoading(false);
      setStatusMsg("");
    }
  };

  const downloadVideo = (url: string, filename: string) => {
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
          <div className="space-y-0.5">
            <h2 className="text-xl font-bold text-gray-900">Veo Video Engine</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Premium Motion Synthesis</p>
          </div>
          <div className="flex gap-4">
             <div className="flex bg-gray-100 p-1 rounded-xl">
              {(["720p", "1080p"] as const).map(res => (
                <button
                  key={res}
                  onClick={() => setConfig(prev => ({ ...prev, resolution: res }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${config.resolution === res ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500'}`}
                >
                  {res}
                </button>
              ))}
            </div>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              {(["16:9", "9:16"] as const).map(ratio => (
                <button
                  key={ratio}
                  onClick={() => setConfig(prev => ({ ...prev, aspectRatio: ratio }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${config.aspectRatio === ratio ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500'}`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex gap-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A cinematic drone flight over a volcano..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all resize-none h-20"
          />
          <button 
            onClick={handleGenerate}
            disabled={!prompt.trim() || isLoading}
            className="bg-purple-600 text-white px-8 rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 shadow-lg shadow-purple-500/20 transition-all flex flex-col items-center justify-center shrink-0 min-w-[140px]"
          >
            {isLoading ? (
              <div className="flex flex-col items-center">
                <svg className="animate-spin h-5 w-5 text-white mb-1" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-[10px] font-medium">{statusMsg}</span>
              </div>
            ) : "Generate"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8">
          {archive.map((asset) => (
            <div key={asset.id} className="group bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-md hover:shadow-2xl transition-all">
              <div className={`relative bg-black flex items-center justify-center ${asset.config?.aspectRatio === '9:16' ? 'aspect-[9/16] max-h-[500px] mx-auto' : 'aspect-video'}`}>
                <video src={asset.url} className="w-full h-full object-contain" controls loop muted />
                <div className="absolute top-4 right-4">
                  <button 
                    onClick={() => downloadVideo(asset.url, `studio-vid-${asset.id}.mp4`)}
                    className="p-3 bg-white/90 hover:bg-white text-gray-900 rounded-2xl shadow-2xl transition-all hover:scale-110 flex items-center gap-2 font-bold text-sm"
                  >
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                </div>
                <div className="absolute bottom-4 left-4 flex gap-2">
                  <span className="bg-black/60 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase backdrop-blur-md">
                    {asset.config?.resolution}
                  </span>
                </div>
              </div>
              <div className="p-6 bg-white border-t border-gray-100">
                <p className="text-gray-800 font-medium text-sm line-clamp-2">"{asset.prompt}"</p>
                <p className="mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  Created {new Date(asset.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
          {archive.length === 0 && !isLoading && (
            <div className="col-span-full py-28 text-center text-gray-400 bg-white rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-200">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="font-bold text-gray-600">No videos generated yet</p>
              <p className="text-sm">Your cinematic masterpieces will be archived here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoGenerator;
