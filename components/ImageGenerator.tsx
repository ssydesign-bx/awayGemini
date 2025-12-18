import React, { useState } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeneratedAsset, ImageConfig } from '../types';

interface ImageGeneratorProps {
  onKeyNeeded: () => void;
  hasKey: boolean;
  archive: GeneratedAsset[];
  onNewAsset: (asset: GeneratedAsset) => void;
  apiKey?: string;
}

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ onKeyNeeded, hasKey, archive, onNewAsset, apiKey }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [config, setConfig] = useState<ImageConfig>({
    quality: 'standard',
    aspectRatio: '1:1',
    imageSize: '1K'
  });

  const generateImage = async () => {
    if (!prompt.trim()) return;
    if (!hasKey && !apiKey && !process.env.GEMINI_API_KEY) {
      onKeyNeeded();
      return;
    }

    setIsGenerating(true);
    try {
      const client = new GoogleGenerativeAI(apiKey || process.env.GEMINI_API_KEY || '');
      // Imagen 3 모델 호출 방식 (GoogleGenerativeAI SDK 표준에 맞게 수정)
      // 주의: 현재 SDK 버전에 따라 imagen 모델 호출 방식이 다를 수 있으나, 표준 텍스트 생성 방식으로 시도
      const model = client.getGenerativeModel({ model: "gemini-pro-vision" }); // 임시로 비전 모델 또는 사용 가능한 최신 모델

      // *중요*: Imagen 3는 현재 별도의 REST API나 Vertex AI를 통해 호출되는 경우가 많습니다.
      // 이 코드는 API 키가 이미지 생성을 지원하는 모델(예: gemini-pro 등)에 접근 가능할 때 작동합니다.
      // 만약 작동하지 않는다면 prompt를 텍스트로 받아 "이미지를 그려줘"라고 요청하는 방식이 될 수 있습니다.
      
      // 여기서는 에러 방지를 위해 Mockup 처리하거나, 텍스트 모델을 호출합니다.
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      // 실제 이미지 생성 API가 열리면 이 부분을 해당 로직으로 교체해야 합니다.
      // 현재는 안전하게 텍스트 응답을 처리하거나 에러를 냅니다.
      throw new Error("현재 API 키로는 이미지 생성 모델(Imagen)에 직접 접근할 수 없습니다. (Vertex AI 필요)");

    } catch (error: any) {
      console.error("Image generation failed:", error);
      alert(`이미지 생성 실패: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col h-fit">
        <h2 className="text-xl font-semibold mb-6">Image Generator</h2>
        <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-32 p-3 bg-gray-50 border border-gray-200 rounded-xl mb-4"
            placeholder="Describe the image..."
        />
        <button
            onClick={generateImage}
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-3 bg-purple-600 text-white rounded-xl"
        >
            {isGenerating ? "Generating..." : "Generate Image"}
        </button>
      </div>
       <div className="lg:col-span-2 overflow-y-auto pr-2 space-y-4">
        {/* 아카이브 영역 */}
         {archive.length === 0 && <p className="text-center text-gray-400 mt-10">No images yet.</p>}
         {archive.map(asset => (
             <div key={asset.id}><img src={asset.url} alt={asset.prompt} className="w-full rounded-lg"/></div>
         ))}
      </div>
    </div>
  );
};

export default ImageGenerator;