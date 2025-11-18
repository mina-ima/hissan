
import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Key, Trash2, Check, AlertTriangle } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');

  useEffect(() => {
    const key = localStorage.getItem('gemini_api_key');
    if (key) {
      setSavedKey(key);
      setApiKey(key);
    }
  }, []);

  const handleSave = () => {
    if (!apiKey.trim()) return;
    localStorage.setItem('gemini_api_key', apiKey.trim());
    setSavedKey(apiKey.trim());
    alert('APIキーを保存しました！これでAI先生とお話しできます。');
    onClose();
    // Reload to ensure services pick up the new key immediately if needed, 
    // though our service reads from localStorage on each call, so reload isn't strictly necessary but safer for state sync.
    window.location.reload();
  };

  const handleDelete = () => {
    localStorage.removeItem('gemini_api_key');
    setSavedKey('');
    setApiKey('');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gray-800 p-4 flex items-center justify-between">
          <h3 className="text-white font-bold text-xl flex items-center gap-2">
            <Key size={20} className="text-yellow-400" />
            設定 (APIキー)
          </h3>
          <button onClick={onClose} className="bg-white/20 p-2 rounded-full text-white hover:bg-white/30 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
             <p className="text-sm text-blue-800 leading-relaxed">
               AI先生（Gemini）とお話しするには、GoogleのAPIキーが必要です。<br/>
               Googleアカウントがあれば、誰でも無料で取得できます。
             </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">
              1. APIキーを取得する
            </label>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center gap-3">
                 <div className="bg-blue-100 p-2 rounded-lg text-blue-600 group-hover:bg-blue-200">
                   <ExternalLink size={20} />
                 </div>
                 <span className="font-bold text-gray-700 group-hover:text-blue-700">Google AI Studioを開く</span>
              </div>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">別タブで開きます</span>
            </a>
            <p className="text-xs text-gray-500 pl-1">
              ※ "Create API key" をクリックしてキーをコピーしてください。
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">
              2. キーを貼り付ける
            </label>
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full p-4 pl-12 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none font-mono text-sm transition-all"
              />
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button 
              onClick={handleSave}
              disabled={!apiKey}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-200 transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Check size={20} /> 保存する
            </button>
            
            {savedKey && (
               <button 
                 onClick={handleDelete}
                 className="bg-red-100 hover:bg-red-200 text-red-500 p-3 rounded-xl transition-colors"
                 title="キーを削除"
               >
                 <Trash2 size={20} />
               </button>
            )}
          </div>

          {savedKey && (
             <div className="flex items-center gap-2 text-xs text-green-600 font-bold justify-center bg-green-50 py-2 rounded-lg">
                <Check size={14} />
                <span>APIキーは保存されています</span>
             </div>
          )}
          
          <div className="text-[10px] text-gray-400 text-center leading-tight">
            ※ APIキーはあなたのブラウザにのみ保存されます。<br/>
            サーバーには送信されません。
          </div>

        </div>
      </div>
    </div>
  );
};
