
import React, { useState, useEffect } from 'react';
import { AppMode, ChatSession, GeneratedAsset, Message } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatAssistant from './components/ChatAssistant';
import ImageGenerator from './components/ImageGenerator';
import VideoGenerator from './components/VideoGenerator';
import KeyModal from './components/KeyModal';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.CHAT);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('studio_sessions');
    return saved ? JSON.parse(saved) : [{ id: 'default', title: 'New Conversation', messages: [], updatedAt: Date.now() }];
  });
  const [activeSessionId, setActiveSessionId] = useState<string>(sessions[0]?.id || 'default');
  
  const [assetArchive, setAssetArchive] = useState<GeneratedAsset[]>(() => {
    const saved = localStorage.getItem('studio_assets');
    return saved ? JSON.parse(saved) : [];
  });

  const checkKeyStatus = async () => {
    const savedKey = localStorage.getItem('ssy_pro_user_key');
    if (savedKey) {
      setHasApiKey(true);
      return;
    }

    // AI Studio 네이티브 체크
    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
      try {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } catch {
        setHasApiKey(!!process.env.API_KEY);
      }
    } else {
      setHasApiKey(!!process.env.API_KEY);
    }
  };

  useEffect(() => {
    checkKeyStatus();
  }, []);

  const handleSelectKey = async () => {
    // 엄격한 체크: AI Studio 내부인가?
    const isAiStudioEnv = window.aistudio && 
                         typeof window.aistudio.openSelectKey === 'function' &&
                         window.location.hostname.includes('google.com');

    if (isAiStudioEnv) {
      try {
        await window.aistudio!.openSelectKey();
        setHasApiKey(true);
      } catch (error) {
        setIsKeyModalOpen(true);
      }
    } else {
      // Vercel 등 외부 환경에서는 무조건 자체 모달
      setIsKeyModalOpen(true);
    }
  };

  const handleSaveCustomKey = (key: string) => {
    localStorage.setItem('ssy_pro_user_key', key);
    setHasApiKey(true);
    setIsKeyModalOpen(false);
    // 즉시 적용을 위해 페이지를 새로고침하거나 상태를 강제 업데이트 할 수 있습니다.
  };

  const handleError = (err: any) => {
    if (err.message === "PERMISSION_DENIED" || err.message === "AUTH_REQUIRED") {
      setHasApiKey(false);
      setIsKeyModalOpen(true);
    } else {
      alert("Error: " + err.message);
    }
  };

  const updateActiveSession = (newMessages: Message[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return { ...s, messages: newMessages, updatedAt: Date.now() };
      }
      return s;
    }));
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900">
      <Sidebar 
        currentMode={mode} 
        onModeChange={setMode} 
        isOpen={isSidebarOpen} 
        toggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => { setActiveSessionId(id); setMode(AppMode.CHAT); }}
        onNewChat={() => {
          const newS = { id: Date.now().toString(), title: 'New Chat', messages: [], updatedAt: Date.now() };
          setSessions([newS, ...sessions]);
          setActiveSessionId(newS.id);
        }}
        onDeleteSession={(id, e) => {
          e.stopPropagation();
          setSessions(sessions.filter(s => s.id !== id));
        }}
      />
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <Header onSelectKey={handleSelectKey} hasKey={hasApiKey} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {mode === AppMode.CHAT && <ChatAssistant session={activeSession} onUpdateMessages={updateActiveSession} />}
            {mode === AppMode.IMAGE && <ImageGenerator onKeyNeeded={handleSelectKey} hasKey={hasApiKey} archive={assetArchive.filter(a => a.type === 'image')} onNewAsset={(a) => setAssetArchive([a, ...assetArchive])} />}
            {mode === AppMode.VIDEO && <VideoGenerator onKeyNeeded={handleSelectKey} hasKey={hasApiKey} archive={assetArchive.filter(a => a.type === 'video')} onNewAsset={(a) => setAssetArchive([a, ...assetArchive])} />}
          </div>
        </main>
      </div>

      <KeyModal 
        isOpen={isKeyModalOpen} 
        onClose={() => setIsKeyModalOpen(false)} 
        onSave={handleSaveCustomKey} 
      />
    </div>
  );
};

export default App;
