
// Always use GoogleGenAI from @google/genai
import { GoogleGenAI, Type, VideoGenerationReferenceType } from "@google/genai";
import { ImageConfig, VideoConfig } from "../types";

export class GeminiService {
  private static getResolvedKey(): string {
    return process.env.API_KEY || "";
  }

  private static createClient() {
    return new GoogleGenAI({ apiKey: this.getResolvedKey() });
  }

  private static handleError(error: any): never {
    const errStr = error.message?.toLowerCase() || "";
    
    if (errStr.includes("requested entity was not found")) {
      window.dispatchEvent(new CustomEvent('gemini-key-reset'));
      throw new Error("RESELECT_KEY_REQUIRED");
    }

    if (errStr.includes("permission") || errStr.includes("403") || errStr.includes("denied")) {
      throw new Error("PAID_PROJECT_REQUIRED");
    }
    
    throw error;
  }

  static async chat(message: string, history: { role: string, content: string }[], imageData?: string): Promise<{ text: string; grounding: any[]; }> {
    const ai = this.createClient();
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
      this.handleError(error);
    }
  }

  static async generateImage(prompt: string, config: ImageConfig, imageDatas?: string[]): Promise<string> {
    const ai = this.createClient();
    const model = config.quality === 'high' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    
    const parts: any[] = [{ text: prompt }];
    if (imageDatas && imageDatas.length > 0) {
      imageDatas.forEach(data => {
        if (data && data.includes(',')) {
          parts.push({
            inlineData: {
              data: data.split(',')[1],
              mimeType: data.split(';')[0].split(':')[1]
            }
          });
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
            ...(config.quality === 'high' && { imageSize: config.imageSize })
          },
          ...(config.quality === 'high' && { tools: [{ googleSearch: {} }] })
        }
      });

      // 에러 방지를 위한 철저한 검증
      const candidate = response.candidates?.[0];
      if (!candidate) throw new Error("NO_CANDIDATES_RETURNED");
      
      const responseContent = candidate.content;
      if (!responseContent || !responseContent.parts || !Array.isArray(responseContent.parts)) {
        // 안전 필터 등에 의해 결과가 비어있는 경우
        throw new Error("GENERATION_BLOCKED_OR_EMPTY");
      }

      // Safe iteration over parts
      for (const part of responseContent.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      
      throw new Error("NO_IMAGE_DATA_IN_RESPONSE");
    } catch (error: any) {
      this.handleError(error);
    }
  }

  static async generateVideo(prompt: string, config: VideoConfig, imageDatas?: string[], onProgress?: (msg: string) => void): Promise<string> {
    const ai = this.createClient();
    onProgress?.("Initializing Video Engine...");
    
    const isMultiRef = imageDatas && imageDatas.length > 1;
    const model = isMultiRef ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';
    
    const videoParams: any = {
      model,
      prompt,
      config: {
        numberOfVideos: 1,
        resolution: isMultiRef ? '720p' : config.resolution,
        aspectRatio: isMultiRef ? '16:9' : config.aspectRatio
      }
    };

    if (imageDatas && imageDatas.length > 0) {
      if (isMultiRef) {
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
      this.handleError(error);
    }
  }
}
