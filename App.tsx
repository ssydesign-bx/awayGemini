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
  
  // [핵심 변경] 사용자의 API 키를 저장하는 상태 추가
  const [apiKey, setApiKey] = useState<string>('');
  const [hasApiKey, setHasApiKey] = useState(false);
  
  // Archiving states
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
      // 1. 구글 AI Studio 내부 환경 체크
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } 
      // 2. [변경] 방문자가 이전에 입력한 키가 브라우저에 있는지 확인
      else {
        const storedKey = localStorage.getItem('user_gemini_key');
        if (storedKey) {
          setApiKey(storedKey);
          setHasApiKey(true);
        }
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

  // [핵심 변경] 키 입력 버튼을 눌렀을 때 동작
  const handleSelectKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    } else {
      // [변경] 일반 웹사이트 접속자에게 입력창 띄우기
      const userKey = window.prompt("Google Gemini API 키를 입력해주세요 (sk-...)");
      if (userKey && userKey.trim().length > 0) {
        setApiKey(userKey);
        setHasApiKey(true);
        localStorage.setItem('user_gemini_key', userKey); // 편의를 위해 저장
        alert("API 키가 적용되었습니다.");
      }
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
    // [핵심 변경] apiKey를 각 컴포넌트에 props로 전달 (에러가 나면 2번 단계 참조)
    switch (mode) {
      case AppMode.CHAT:
        return <ChatAssistant 
                  session={activeSession} 
                  onUpdateMessages={updateActiveSession} 
                  apiKey={apiKey} 
                />;
      case AppMode.IMAGE:
        return <ImageGenerator 
                  onKeyNeeded={handleSelectKey} 
                  hasKey={hasApiKey} 
                  archive={assetArchive.filter(a => a.type === 'image')} 
                  onNewAsset={archiveAsset} 
                  apiKey={apiKey}
                />;
      case AppMode.VIDEO:
        return <VideoGenerator 
                  onKeyNeeded={handleSelectKey} 
                  hasKey={hasApiKey} 
                  archive={assetArchive.filter(a => a.type === 'video')} 
                  onNewAsset={archiveAsset} 
                  apiKey={apiKey}
                />;
      default:
        return <ChatAssistant session={activeSession} onUpdateMessages={updateActiveSession} apiKey={apiKey} />;
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