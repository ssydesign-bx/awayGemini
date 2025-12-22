
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
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Connect Pro API</h2>
              <p className="text-sm text-gray-500 mt-1 font-medium">Unlock Gemini 3 Pro, 4K & Veo Video.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Paid Project API Key</label>
              <div className="relative">
                <input
                  type="password"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-lime-500/10 transition-all font-mono text-sm"
                />
              </div>
            </div>

            <div className="bg-blue-50 rounded-2xl p-4 flex gap-3 border border-blue-100">
              <div className="text-blue-600 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-xs text-blue-800 leading-relaxed">
                <p className="font-bold mb-1">Multi-user Safe & Isolated</p>
                <p>Your API key is stored <strong>only in your browser</strong>. It is never shared with other users or stored on our servers. Each person uses their own personal workspace.</p>
              </div>
            </div>

            <div className="bg-amber-50 rounded-2xl p-4 flex gap-3 border border-amber-100">
              <div className="text-amber-600 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="text-xs text-amber-800 leading-relaxed">
                <p className="font-bold mb-1">Crucial Requirement</p>
                <p>Gemini 3 Pro Image & Veo models require an API key from a <strong>Paid Google Cloud Project</strong>. Free tier keys will return 'Permission Denied'.</p>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline font-black mt-2 block hover:text-amber-900">Check Billing Setup →</a>
              </div>
            </div>

            <button
              onClick={() => {
                if (key.trim()) {
                  onSave(key.trim());
                }
              }}
              disabled={!key.trim()}
              className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-black shadow-xl transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              Verify & Activate Pro
            </button>
          </div>
        </div>
        
        <div className="bg-gray-50 px-8 py-4 text-center">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Keys are stored locally in your private browser storage.</p>
        </div>
      </div>
    </div>
  );
};

export default KeyModal;
