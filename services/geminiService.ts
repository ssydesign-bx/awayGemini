
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { ImageConfig, VideoConfig } from "../types";

export class GeminiService {
  /**
   * Helper to create a new GoogleGenAI instance right before making an API call.
   * This ensures it always uses the most up-to-date API key from the environment.
   */
  private static getClient() {
    // The API key must be obtained exclusively from the environment variable process.env.API_KEY.
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      throw new Error("API Key is missing. Please select an API key.");
    }
    
    return new GoogleGenAI({ apiKey });
  }

  // Updated chat method to pass history to ai.chats.create to maintain conversation context.
  static async chat(message: string, history: { role: string, content: string }[]) {
    const ai = this.getClient();
    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      // Pass the conversation history converted to the format expected by the SDK.
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
    // Use the .text property directly as per the latest SDK guidelines.
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
        }
      }
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
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
    
    // The response.body contains the MP4 bytes. You must append an API key when fetching from the download link.
    const apiKey = process.env.API_KEY;
    const response = await fetch(`${downloadLink}&key=${apiKey}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
}
