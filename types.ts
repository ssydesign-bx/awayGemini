export enum AppMode {
  CHAT = 'CHAT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO'
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  grounding?: any[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export interface ImageConfig {
  quality: 'standard' | 'high';
  aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  imageSize?: "1K" | "2K" | "4K";
}

export interface VideoConfig {
  resolution: "720p" | "1080p";
  aspectRatio: "16:9" | "9:16";
}

export interface GeneratedAsset {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt: string;
  timestamp: number;
  config?: any;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    // Fixed: Added the optional modifier to 'aistudio' to ensure it matches the 
    // modifier of the ambient declaration in the environment, resolving the 
    // "All declarations of 'aistudio' must have identical modifiers" error.
    aistudio?: AIStudio;
  }
}