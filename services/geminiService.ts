import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { ImageConfig, VideoConfig } from "../types";

export class GeminiService {
  private static getClient() {
    // The API key must be obtained exclusively from the environment variable process.env.API_KEY.
    // Create a new instance right before making an API call to ensure it uses the most up-to-date key.
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  static async chat(message: string, history: { role: string, content: string }[], imageData?: string) {
    const ai = this.getClient();
    // Complex Text Tasks use gemini-3-pro-preview
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
  }

  static async generateImage(prompt: string, config: ImageConfig, imageData?: string) {
    const ai = this.getClient();
    // Use gemini-3-pro-image-preview for high-quality or gemini-2.5-flash-image for standard tasks
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

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio,
          ...(config.quality === 'high' && { imageSize: config.imageSize || '1K' })
        },
        // Google Search tool is only available for gemini-3-pro-image-preview
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
  }
}