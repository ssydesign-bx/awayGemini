
import React, { useState, useRef, useEffect } from 'react';
import { GeminiService } from '../services/geminiService';
import { Message, ChatSession } from '../types';

interface ChatAssistantProps {
  session: ChatSession;
  onUpdateMessages: (msgs: Message[]) => void;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ session, onUpdateMessages }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session.messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Please upload an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setAttachedImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) processFile(blob);
      }
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachedImage) || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input || (attachedImage ? "[Attached Image]" : ""),
      timestamp: Date.now()
    };

    const updatedMessages = [...session.messages, userMsg];
    onUpdateMessages(updatedMessages);
    const currentInput = input;
    const currentImage = attachedImage;
    
    setInput('');
    setAttachedImage(null);
    setIsLoading(true);

    try {
      const response = await GeminiService.chat(
        currentInput || "Describe this image", 
        updatedMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
        currentImage || undefined
      );
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text,
        grounding: response.grounding,
        timestamp: Date.now()
      };
      onUpdateMessages([...updatedMessages, assistantMsg]);
    } catch (error) {
      console.error(error);
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Error: " + (error instanceof Error ? error.message : "Generation failed"),
        timestamp: Date.now()
      };
      onUpdateMessages([...updatedMessages, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-lime-100 text-lime-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-gray-800 text-sm">{session.title}</h2>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">Multi-modal Gemini 3 Pro</p>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {session.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-gray-600">Drop or Paste images here</p>
              <p className="max-w-xs text-sm">Ask Gemini to analyze designs, code from screenshots, or explain charts.</p>
            </div>
          </div>
        )}
        {session.messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 ${
              msg.role === 'user' 
                ? 'bg-lime-500 text-white shadow-md rounded-tr-none' 
                : 'bg-gray-100 text-gray-800 rounded-tl-none'
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</p>
              {msg.grounding && msg.grounding.length > 0 && (
                <div className={`mt-4 pt-3 border-t text-xs ${msg.role === 'user' ? 'border-lime-400/30' : 'border-gray-200'}`}>
                  <div className="flex flex-wrap gap-2">
                    {msg.grounding.map((chunk, idx) => chunk.web && (
                      <a key={idx} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className={`px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-all border ${msg.role === 'user' ? 'border-white/10' : 'border-gray-200'}`}>
                        {chunk.web.title || 'Source'}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-5 py-3.5 rounded-tl-none flex gap-1.5">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-.3s]"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-.5s]"></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <div className="max-w-4xl mx-auto space-y-3">
          {attachedImage && (
            <div className="relative inline-block">
              <img src={attachedImage} className="h-20 w-20 object-cover rounded-xl border-2 border-lime-500" />
              <button 
                onClick={() => setAttachedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Message or paste image (Ctrl+V)..."
              className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 pr-24 focus:outline-none focus:ring-4 focus:ring-lime-500/10 transition-all resize-none shadow-sm text-sm"
              rows={2}
            />
            <div className="absolute right-3.5 bottom-3.5 flex items-center gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-gray-400 hover:text-lime-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <button 
                onClick={handleSend}
                disabled={(!input.trim() && !attachedImage) || isLoading}
                className="p-2.5 bg-lime-500 text-white rounded-xl hover:bg-lime-600 disabled:opacity-50 transition-all shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;
