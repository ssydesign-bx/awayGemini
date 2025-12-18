import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatSession, Message } from '../types';

interface ChatAssistantProps {
  session: ChatSession;
  onUpdateMessages: (messages: Message[]) => void;
  apiKey?: string;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ session, onUpdateMessages, apiKey }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session.messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!apiKey && !process.env.GEMINI_API_KEY) {
      alert("API 키가 필요합니다. 우측 상단의 'Select API Key' 버튼을 눌러 키를 입력해주세요.");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    const newMessages = [...session.messages, userMessage];
    onUpdateMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const client = new GoogleGenerativeAI(apiKey || process.env.GEMINI_API_KEY || '');
      const model = client.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
      
      const chat = model.startChat({
        history: newMessages.slice(0, -1).map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }))
      });

      const result = await chat.sendMessage(userMessage.content);
      const text = result.response.text();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: text,
        timestamp: Date.now()
      };

      onUpdateMessages([...newMessages, botMessage]);
    } catch (error: any) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `오류가 발생했습니다: ${error.message || "알 수 없는 오류"}`,
        timestamp: Date.now()
      };
      onUpdateMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {session.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
            <p>대화를 시작해보세요</p>
          </div>
        ) : (
          session.messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
              }`}>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
              ...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={apiKey ? "메시지를 입력하세요..." : "API 키를 먼저 입력해주세요"}
            disabled={isLoading}
            className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" disabled={!input.trim() || isLoading} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600">
            전송
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatAssistant;