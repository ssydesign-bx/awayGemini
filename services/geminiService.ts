
import { GoogleGenAI, Type, GenerateContentResponse, Modality, VideoGenerationReferenceType } from "@google/genai";
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
      const errStr = error.message?.toLowerCase() || "";
      if (errStr.includes("permission") || errStr.includes("403") || errStr.includes("denied")) {
        throw new Error("PAID_PROJECT_REQUIRED");
      }
      throw error;
    }
  }

  static async generateImage(prompt: string, config: ImageConfig, imageDatas?: string[]) {
    const ai = this.getClient();
    const model = config.quality === 'high' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    
    const parts: any[] = [{ text: prompt }];
    if (imageDatas && imageDatas.length > 0) {
      imageDatas.forEach(data => {
        parts.push({
          inlineData: {
            data: data.split(',')[1],
            mimeType: data.split(';')[0].split(':')[1]
          }
        });
      });
    }

    try {
      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: config.aspectRatio,
            ...(config.quality === 'high' && { imageSize: config.imageSize })
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
      const errStr = error.message?.toLowerCase() || "";
      if (errStr.includes("permission") || errStr.includes("403") || errStr.includes("denied")) {
        throw new Error("PAID_PROJECT_REQUIRED");
      }
      throw error;
    }
  }

  static async generateVideo(prompt: string, config: VideoConfig, imageDatas?: string[], onProgress?: (msg: string) => void) {
    const ai = this.getClient();
    onProgress?.("Initializing Video Engine...");
    
    // 다중 참조 이미지(최대 3장)의 경우 veo-3.1-generate-preview 모델 사용
    const isMultiRef = imageDatas && imageDatas.length > 1;
    const model = isMultiRef ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';
    
    const videoParams: any = {
      model,
      prompt,
      config: {
        numberOfVideos: 1,
        resolution: isMultiRef ? '720p' : config.resolution, // 다중 참조는 720p 고정
        aspectRatio: isMultiRef ? '16:9' : config.aspectRatio // 다중 참조는 16:9 고정
      }
    };

    if (imageDatas && imageDatas.length > 0) {
      if (isMultiRef) {
        // 최대 3장까지만 지원
        const refImages = imageDatas.slice(0, 3).map(data => ({
          image: {
            imageBytes: data.split(',')[1],
            mimeType: data.split(';')[0].split(':')[1]
          },
          referenceType: VideoGenerationReferenceType.ASSET
        }));
        videoParams.config.referenceImages = refImages;
      } else {
        videoParams.image = {
          imageBytes: imageDatas[0].split(',')[1],
          mimeType: imageDatas[0].split(';')[0].split(':')[1]
        };
      }
    }

    try {
      let operation = await ai.models.generateVideos(videoParams);
      while (!operation.done) {
        onProgress?.("Processing motion frames...");
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("VIDEO_FAILED");
      
      const response = await fetch(`${downloadLink}&key=${this.getResolvedKey()}`);
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error: any) {
      const errStr = error.message?.toLowerCase() || "";
      if (errStr.includes("permission") || errStr.includes("403") || errStr.includes("denied")) {
        throw new Error("PAID_PROJECT_REQUIRED");
      }
      throw error;
    }
  }
}
