
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { ImageConfig, VideoConfig } from "../types";

export class GeminiService {
  private static getResolvedKey(): string {
    const savedKey = localStorage.getItem('ssy_pro_user_key');
    if (savedKey) return savedKey;

    const envKey = process.env.API_KEY;
    if (envKey) return envKey;

    throw new Error("AUTH_REQUIRED");
  }

  private static getClient() {
    return new GoogleGenAI({ apiKey: this.getResolvedKey() });
  }

  static async chat(message: string, history: { role: string, content: string }[], imageData?: string) {
    const ai = this.getClient();
    const model = 'gemini-3-pro-preview';
    
    const parts: any[] = [{ text: message }];
    if (imageData) {
      parts.push({
        inlineData: {
          data: imageData.split(',')[1],
          mimeType: imageData.split(';')[0].split(':')[1]
        }
      });
    }

    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          ...history.map(h => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }]
          })),
          { role: 'user', parts }
        ],
        config: {
          systemInstruction: "You are a professional creative director. Help the user brainstorm ideas.",
          tools: [{ googleSearch: {} }]
        }
      });

      return {
        text: response.text || '',
        grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
      };
    } catch (error: any) {
      if (error.message?.toLowerCase().includes("permission") || error.message?.includes("403")) {
        localStorage.removeItem('ssy_pro_user_key');
        throw new Error("PERMISSION_DENIED");
      }
      throw error;
    }
  }

  static async generateImage(prompt: string, config: ImageConfig, imageData?: string) {
    const ai = this.getClient();
    // Pro 모델은 권한이 엄격하므로 에러 발생 가능성이 높음
    const model = config.quality === 'high' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    
    const parts: any[] = [{ text: prompt }];
    if (imageData) {
      parts.push({
        inlineData: {
          data: imageData.split(',')[1],
          mimeType: imageData.split(';')[0].split(':')[1]
        }
      });
    }

    try {
      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: config.aspectRatio,
            ...(config.quality === 'high' && { imageSize: config.imageSize || '1K' })
          },
          ...(config.quality === 'high' && { tools: [{ googleSearch: {} }] })
        }
      });

      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
        for (const part of candidates[0].content.parts) {
          if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }
      throw new Error("NO_IMAGE_DATA");
    } catch (error: any) {
      // 권한 없음 에러 발생 시 키를 삭제하여 재입력 유도
      if (error.message?.toLowerCase().includes("permission") || error.message?.includes("403")) {
        localStorage.removeItem('ssy_pro_user_key');
        throw new Error("PERMISSION_DENIED");
      }
      throw error;
    }
  }

  static async generateVideo(prompt: string, config: VideoConfig, imageData?: string, onProgress?: (msg: string) => void) {
    const ai = this.getClient();
    onProgress?.("Initializing Veo 3.1 engine...");
    
    const videoParams: any = {
      model: 'veo-3.1-fast-generate-preview',
      prompt,
      config: {
        numberOfVideos: 1,
        resolution: config.resolution,
        aspectRatio: config.aspectRatio
      }
    };

    if (imageData) {
      videoParams.image = {
        imageBytes: imageData.split(',')[1],
        mimeType: imageData.split(';')[0].split(':')[1]
      };
    }

    try {
      let operation = await ai.models.generateVideos(videoParams);
      while (!operation.done) {
        onProgress?.("Generating temporal frames...");
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("VIDEO_FAILED");
      
      const response = await fetch(`${downloadLink}&key=${this.getResolvedKey()}`);
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error: any) {
      if (error.message?.toLowerCase().includes("permission") || error.message?.includes("403")) {
        localStorage.removeItem('ssy_pro_user_key');
        throw new Error("PERMISSION_DENIED");
      }
      throw error;
    }
  }
}
