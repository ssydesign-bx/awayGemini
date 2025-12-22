
import React, { useState, useEffect } from 'react';

interface KeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
}

const KeyModal: React.FC<KeyModalProps> = ({ isOpen, onClose, onSave }) => {
  const [manualKey, setManualKey] = useState('');
  const [isAiStudioAvailable, setIsAiStudioAvailable] = useState(false);

  useEffect(() => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      setIsAiStudioAvailable(true);
    }
    const saved = localStorage.getItem('ssy_manual_api_key');
    if (saved) setManualKey(saved);
  }, [isOpen]);

  const handleAiStudioSelect = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        localStorage.removeItem('ssy_manual_api_key'); // 수동 키 제거하고 공식 연동 우선
        onSave(""); // App.tsx에서 키 상태를 다시 체크하도록 유도
        onClose();
      } catch (e) {
        console.error("AI Studio key selection failed", e);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Access Control</h2>
              <p className="text-sm text-gray-500 mt-1 font-medium">Configure your Gemini Pro API Key.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* AI Studio 연동 섹션 */}
            {isAiStudioAvailable && (
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Official Integration</label>
                <button
                  onClick={handleAiStudioSelect}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                  Select from AI Studio
                </button>
              </div>
            )}

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <div className="relative flex justify-center text-[10px] font-bold uppercase text-gray-300 bg-white px-2 tracking-widest">OR</div>
            </div>

            {/* 수동 입력 섹션 */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Manual API Key Entry</label>
                <input
                  type="password"
                  value={manualKey}
                  onChange={(e) => setManualKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all font-mono text-sm"
                />
              </div>

              <button
                onClick={() => onSave(manualKey)}
                disabled={!manualKey.trim()}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-black transition-all disabled:opacity-30 active:scale-95 shadow-lg"
              >
                Save Custom Key
              </button>
            </div>

            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
              <div className="flex gap-3">
                <div className="text-amber-600 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="text-[11px] text-amber-800 leading-relaxed font-medium">
                  <strong>Pro Models Only:</strong> Gemini 3 Pro and Veo require a key from a <strong>Paid Billing Project</strong>. Manual keys are stored locally in your browser.
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 px-8 py-4 text-center">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Your data is yours. Keys are never stored on our servers.</p>
        </div>
      </div>
    </div>
  );
};

export default KeyModal;
