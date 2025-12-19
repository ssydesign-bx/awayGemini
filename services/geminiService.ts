
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { ImageConfig, VideoConfig } from "../types";

export class GeminiService {
  private static getClient() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY is not configured. Please ensure it is set in your environment variables or selected in AI Studio.");
    }
    // 호출 직전에 새로운 인스턴스를 생성하여 최신 키가 반영되도록 함
    return new GoogleGenAI({ apiKey });
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
          systemInstruction: "You are a professional creative director and assistant. Help the user brainstorm ideas, analyze designs, and provide technical guidance.",
          tools: [{ googleSearch: {} }]
        }
      });

      return {
        text: response.text || '',
        grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
      };
    } catch (error: any) {
      if (error.message?.includes("Requested entity was not found")) {
        throw new Error("API Key is invalid or not found. Please re-select your key.");
      }
      throw error;
    }
  }

  static async generateImage(prompt: string, config: ImageConfig, imageData?: string) {
    const ai = this.getClient();
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
          // Pro 모델에서만 googleSearch 도구 사용 가능
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
      throw new Error("No image data returned from Gemini.");
    } catch (error: any) {
      if (error.message?.includes("Requested entity was not found")) {
        throw new Error("API Key issue: Please re-select your key via the Header button.");
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

      const messages = ["Refining physics...", "Temporal synthesis...", "Lighting pass...", "Finalizing bytes..."];
      let msgIdx = 0;

      while (!operation.done) {
        onProgress?.(messages[msgIdx % messages.length]);
        msgIdx++;
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("Video generation failed");
      
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error: any) {
      if (error.message?.includes("Requested entity was not found")) {
        throw new Error("API Key issue during video generation. Please re-select your key.");
      }
      throw error;
    }
  }
}
