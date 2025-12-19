
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
  
  // Persistence for sessions and generated assets
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('studio_sessions');
    return saved ? JSON.parse(saved) : [{ id: 'default', title: 'New Conversation', messages: [], updatedAt: Date.now() }];
  });
  const [activeSessionId, setActiveSessionId] = useState<string>(sessions[0]?.id || 'default');
  
  const [assetArchive, setAssetArchive] = useState<GeneratedAsset[]>(() => {
    const saved = localStorage.getItem('studio_assets');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const checkKey = async () => {
      // Check whether an API key has been selected using AI Studio native API
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        // Fallback check for environment variable
        setHasApiKey(!!process.env.API_KEY);
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    localStorage.setItem('studio_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('studio_assets', JSON.stringify(assetArchive));
  }, [assetArchive]);

  const handleSelectKey = async () => {
    // Open the native AI Studio key selection dialog
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      // To prevent race conditions, assume the key selection was successful and update state
      setHasApiKey(true);
    } 
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      updatedAt: Date.now()
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
    setMode(AppMode.CHAT);
  };

  const updateActiveSession = (newMessages: Message[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        const firstUserMsg = newMessages.find(m => m.role === 'user');
        const newTitle = firstUserMsg ? (firstUserMsg.content.slice(0, 25) + (firstUserMsg.content.length > 25 ? '...' : '')) : s.title;
        return { ...s, messages: newMessages, updatedAt: Date.now(), title: newTitle };
      }
      return s;
    }));
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    if (newSessions.length === 0) {
      const defaultS = { id: 'default', title: 'New Conversation', messages: [], updatedAt: Date.now() };
      setSessions([defaultS]);
      setActiveSessionId('default');
    } else {
      setSessions(newSessions);
      if (activeSessionId === id) setActiveSessionId(newSessions[0].id);
    }
  };

  const archiveAsset = (asset: GeneratedAsset) => {
    setAssetArchive(prev => [asset, ...prev]);
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  const renderContent = () => {
    switch (mode) {
      case AppMode.CHAT:
        return <ChatAssistant session={activeSession} onUpdateMessages={updateActiveSession} />;
      case AppMode.IMAGE:
        return <ImageGenerator onKeyNeeded={handleSelectKey} hasKey={hasApiKey} archive={assetArchive.filter(a => a.type === 'image')} onNewAsset={archiveAsset} />;
      case AppMode.VIDEO:
        return <VideoGenerator onKeyNeeded={handleSelectKey} hasKey={hasApiKey} archive={assetArchive.filter(a => a.type === 'video')} onNewAsset={archiveAsset} />;
      default:
        return <ChatAssistant session={activeSession} onUpdateMessages={updateActiveSession} />;
    }
  };

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
        onNewChat={createNewSession}
        onDeleteSession={deleteSession}
      />
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <Header onSelectKey={handleSelectKey} hasKey={hasApiKey} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
