
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
      content: input || (attachedImage ? "[Image]" : ""),
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
        content: "Error: Generation failed",
        timestamp: Date.now()
      };
      onUpdateMessages([...updatedMessages, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex flex-col gap-0.5">
        <h2 className="font-bold text-gray-900 text-sm tracking-tight">{session.title}</h2>
        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Gemini Pro Multi-modal</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {session.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-300 space-y-2">
            <p className="font-bold text-xs uppercase tracking-widest">Start a conversation</p>
            <p className="text-sm">Ask Gemini to help with your designs or code.</p>
          </div>
        )}
        {session.messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 ${
              msg.role === 'user' 
                ? 'bg-gray-900 text-white shadow-sm' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</p>
              {msg.grounding && msg.grounding.length > 0 && (
                <div className={`mt-3 pt-3 border-t text-[11px] ${msg.role === 'user' ? 'border-white/10' : 'border-gray-200'}`}>
                  <div className="flex flex-wrap gap-2">
                    {msg.grounding.map((chunk, idx) => chunk.web && (
                      <a key={idx} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="underline opacity-70 hover:opacity-100">
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
            <div className="bg-gray-100 rounded-xl px-4 py-2 flex gap-1 items-center">
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:-.3s]"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:-.5s]"></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100">
        <div className="max-w-4xl mx-auto space-y-3">
          {attachedImage && (
            <div className="relative inline-block">
              <img src={attachedImage} className="h-16 w-16 object-cover rounded-lg border border-gray-200" />
              <button 
                onClick={() => setAttachedImage(null)}
                className="absolute -top-2 -right-2 bg-gray-900 text-white rounded-full p-1"
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
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
              placeholder="Type or paste image..."
              className="w-full bg-gray-50 border border-transparent rounded-xl px-5 py-4 pr-16 focus:outline-none focus:bg-white focus:border-gray-100 transition-all resize-none text-sm"
              rows={2}
            />
            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>
              <button 
                onClick={handleSend}
                disabled={(!input.trim() && !attachedImage) || isLoading}
                className="p-2 bg-gray-900 text-white rounded-lg hover:bg-black disabled:opacity-30 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
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
