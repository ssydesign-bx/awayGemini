import React, { useState } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeneratedAsset, VideoConfig } from '../types';

interface VideoGeneratorProps {
  onKeyNeeded: () => void;
  hasKey: boolean;
  archive: GeneratedAsset[];
  onNewAsset: (asset: GeneratedAsset) => void;
  apiKey?: string;
}

const VideoGenerator: React.FC<VideoGeneratorProps> = ({ onKeyNeeded, hasKey, archive, onNewAsset, apiKey }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [config, setConfig] = useState<VideoConfig>({
    resolution: '720p',
    aspectRatio: '16:9'
  });

  const generateVideo = async () => {
    if (!prompt.trim()) return;
    if (!hasKey && !apiKey && !process.env.GEMINI_API_KEY) {
      onKeyNeeded();
      return;
    }

    setIsGenerating(true);
    try {
      const client = new GoogleGenerativeAI(apiKey || process.env.GEMINI_API_KEY || '');
      // Veo 모델 호출 (현재 공개된 API로는 직접 호출이 제한적일 수 있음)
      const model = client.getGenerativeModel({ model: "gemini-pro" }); 
      
      // 비디오 생성은 현재 엔터프라이즈(Vertex AI) 전용인 경우가 많습니다.
      // 텍스트 프롬프트 테스트용으로 남겨둡니다.
      await model.generateContent(prompt);

      throw new Error("현재 API 키로는 비디오 생성 모델(Veo)에 직접 접근할 수 없습니다.");

    } catch (error: any) {
      console.error("Video generation failed:", error);
      alert(`비디오 생성 실패: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-6">Video Generator</h2>
        <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-32 p-3 bg-gray-50 border border-gray-200 rounded-xl mb-4"
            placeholder="Describe the video..."
        />
        <button
            onClick={generateVideo}
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-3 bg-pink-600 text-white rounded-xl"
        >
            {isGenerating ? "Generating..." : "Generate Video"}
        </button>
      </div>
      <div className="lg:col-span-2">
          {/* 결과물 영역 */}
          {archive.length === 0 && <p className="text-center text-gray-400 mt-10">No videos yet.</p>}
      </div>
    </div>
  );
};

export default VideoGenerator;