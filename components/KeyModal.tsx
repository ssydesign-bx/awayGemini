
import React, { useState } from 'react';

interface KeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
}

const KeyModal: React.FC<KeyModalProps> = ({ isOpen, onClose, onSave }) => {
  const [key, setKey] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Link Your Pro Key</h2>
              <p className="text-sm text-gray-500 mt-1 font-medium">Use your own Gemini API Key for Pro features.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Gemini API Key</label>
              <div className="relative">
                <input
                  type="password"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-lime-500/10 transition-all font-mono text-sm"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-lime-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-lime-50 rounded-2xl p-4 flex gap-3 border border-lime-100">
              <div className="text-lime-600 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-xs text-lime-800 leading-relaxed">
                <p className="font-bold mb-1">How to get a key?</p>
                <p>Go to <a href="https://ai.google.dev/gemini-api/docs/api-key" target="_blank" rel="noopener noreferrer" className="underline font-black hover:text-lime-600">Google AI Studio</a>, create a key in a paid project, and paste it here.</p>
              </div>
            </div>

            <button
              onClick={() => {
                if (key.trim()) {
                  onSave(key.trim());
                  onClose();
                }
              }}
              disabled={!key.trim()}
              className="w-full bg-lime-500 text-white py-4 rounded-2xl font-black text-sm hover:bg-lime-600 shadow-xl shadow-lime-500/30 transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              Activate Pro Mode
            </button>
          </div>
        </div>
        
        <div className="bg-gray-50 px-8 py-4 text-center">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Your key is stored locally in your browser only.</p>
        </div>
      </div>
    </div>
  );
};

export default KeyModal;
