
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { ImageConfig, VideoConfig } from "../types";

export class GeminiService {
  /**
   * Resolves the API key exclusively from the environment variable as per guidelines.
   * The variable is expected to be pre-configured.
   */
  private static getResolvedKey(): string {
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      throw new Error("API Key is missing. Please ensure you have selected a valid API key in AI Studio.");
    }
    return apiKey;
  }

  private static getClient() {
    return new GoogleGenAI({ apiKey: this.getResolvedKey() });
  }

  static async chat(message: string, history: { role: string, content: string }[]) {
    const ai = this.getClient();
    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      history: history.map(h => ({
        role: h.role as any,
        parts: [{ text: h.content }]
      })),
      config: {
        systemInstruction: "You are a professional creative director and assistant. Help the user brainstorm ideas for designs, copy, and creative projects.",
        tools: [{ googleSearch: {} }]
      }
    });

    const response = await chat.sendMessage({ message });
    return {
      text: response.text || '',
      grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  }

  static async generateImage(prompt: string, config: ImageConfig) {
    const ai = this.getClient();
    const model = config.quality === 'high' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio,
          ...(config.quality === 'high' && { imageSize: config.imageSize || '1K' })
        },
        // Google Search is only available for gemini-3-pro-image-preview.
        // Changed google_search to googleSearch as it is the correct type in ToolUnion.
        ...(config.quality === 'high' && { tools: [{ googleSearch: {} }] })
      }
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      for (const part of candidates[0].content.parts) {
        // Find the image part, do not assume it is the first part.
        if (part.inlineData) {
          const base64EncodeString: string = part.inlineData.data;
          return `data:image/png;base64,${base64EncodeString}`;
        } else if (part.text) {
          console.debug(part.text);
        }
      }
    }
    throw new Error("No image generated");
  }

  static async generateVideo(prompt: string, config: VideoConfig, onProgress?: (msg: string) => void) {
    const ai = this.getClient();
    onProgress?.("Connecting to Veo 3.1 engine...");
    
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt,
      config: {
        numberOfVideos: 1,
        resolution: config.resolution,
        aspectRatio: config.aspectRatio
      }
    });

    const messages = [
      "Analyzing prompt dynamics...",
      "Generating keyframes...",
      "Applying temporal consistency...",
      "Synthesizing high-res textures...",
      "Encoding final video stream..."
    ];
    let msgIdx = 0;

    while (!operation.done) {
      onProgress?.(messages[msgIdx % messages.length]);
      msgIdx++;
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed");
    
    const apiKey = this.getResolvedKey();
    const response = await fetch(`${downloadLink}&key=${apiKey}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
}