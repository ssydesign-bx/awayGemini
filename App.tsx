
import React, { useState, useEffect } from 'react';
import { AppMode, ChatSession, GeneratedAsset, Message } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatAssistant from './components/ChatAssistant';
import ImageGenerator from './components/ImageGenerator';
import VideoGenerator from './components/VideoGenerator';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.CHAT);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(false);
  
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
    // Exclusively rely on AI Studio's key selection or process.env
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

    const handleKeyReset = () => {
      setHasApiKey(false);
      // Automatically prompt for key selection on failure as per guidelines
      if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        window.aistudio.openSelectKey();
      } else {
        alert("API Key reset required. Please ensure process.env.API_KEY is configured.");
      }
    };

    window.addEventListener('gemini-key-reset', handleKeyReset);
    return () => window.removeEventListener('gemini-key-reset', handleKeyReset);
  }, []);

  // Persistence Sync
  useEffect(() => {
    localStorage.setItem('studio_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('studio_assets', JSON.stringify(assetArchive));
  }, [assetArchive]);

  const handleSelectKey = async () => {
    // Use the mandatory AI Studio key selection dialog
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        await window.aistudio.openSelectKey();
        // Assume the key selection was successful as per guidelines to avoid race conditions
        setHasApiKey(true);
      } catch (error) {
        console.error("Key selection error:", error);
      }
    } else {
      console.warn("AI Studio key selection not available in this environment.");
    }
  };

  const handleNewAsset = (newAsset: GeneratedAsset) => {
    setAssetArchive(prev => [newAsset, ...prev]);
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
          setMode(AppMode.CHAT);
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
            {mode === AppMode.CHAT && (
              <ChatAssistant session={activeSession} onUpdateMessages={updateActiveSession} />
            )}
            {mode === AppMode.IMAGE && (
              <ImageGenerator 
                onKeyNeeded={handleSelectKey} 
                hasKey={hasApiKey} 
                archive={assetArchive.filter(a => a.type === 'image')} 
                onNewAsset={handleNewAsset} 
              />
            )}
            {mode === AppMode.VIDEO && (
              <VideoGenerator 
                onKeyNeeded={handleSelectKey} 
                hasKey={hasApiKey} 
                archive={assetArchive.filter(a => a.type === 'video')} 
                onNewAsset={handleNewAsset} 
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
