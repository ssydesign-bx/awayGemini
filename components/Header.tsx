
import React from 'react';

interface HeaderProps {
  onSelectKey: () => void;
  hasKey: boolean;
}

const Header: React.FC<HeaderProps> = ({ onSelectKey, hasKey }) => {
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 z-10 glass-effect">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400 font-medium uppercase tracking-wider hidden sm:inline">Workspace / Creative Studio</span>
      </div>

      <div className="flex items-center gap-3">
        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[10px] font-bold text-gray-400 hover:text-lime-600 uppercase tracking-tighter mr-2 hidden md:inline"
        >
          Billing Guide
        </a>
        
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black ${
          hasKey ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
        }`}>
          <div className={`w-2 h-2 rounded-full ${hasKey ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}></div>
          {hasKey ? 'PRO KEY LINKED' : 'BASIC MODE'}
        </div>
        
        <button 
          onClick={onSelectKey}
          className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200"
        >
          {hasKey ? 'UPDATE KEY' : 'LINK PRO KEY'}
        </button>
      </div>
    </header>
  );
};

export default Header;
