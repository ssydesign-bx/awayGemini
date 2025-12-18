
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
        
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black transition-all ${
          hasKey ? 'bg-lime-50 text-lime-700' : 'bg-amber-50 text-amber-700'
        }`}>
          <div className={`w-2 h-2 rounded-full ${hasKey ? 'bg-lime-500 shadow-[0_0_8px_rgba(132,204,22,0.6)]' : 'bg-amber-500 animate-pulse'}`}></div>
          {hasKey ? 'PRO ENGINE ACTIVE' : 'BASIC MODE'}
        </div>
        
        <button 
          onClick={onSelectKey}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
            hasKey 
              ? 'bg-white border border-lime-200 text-lime-600 hover:bg-lime-50 shadow-lime-100' 
              : 'bg-gray-900 text-white hover:bg-gray-800 shadow-gray-200'
          }`}
        >
          {hasKey ? 'KEY LINKED' : 'LINK PRO KEY'}
        </button>
      </div>
    </header>
  );
};

export default Header;
