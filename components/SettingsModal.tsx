
import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Key, Trash2, Check, ShieldCheck } from 'lucide-react';
import * as GeminiService from '../services/geminiService';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [isSystemKey, setIsSystemKey] = useState(false);

  useEffect(() => {
    // システムキー(環境変数)が使われているかチェック
    if (GeminiService.isUsingSystemKey()) {
      setIsSystemKey(true);
      return;
    }

    // ローカルストレージのチェック
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
    alert('APIキーを保存しました！');
    onClose();
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
            設定
          </h3>
          <button onClick={onClose} className="bg-white/20 p-2 rounded-full text-white hover:bg-white/30 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          
          {isSystemKey ? (
            <div className="text-center py-8">
               <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-500">
                  <ShieldCheck size={48} />
               </div>
               <h4 className="text-xl font-bold text-gray-800 mb-2">AI機能は有効です！</h4>
               <p className="text-gray-500">
                 管理者がAPIキーを設定済みです。<br/>
                 すぐにAI先生と一緒に学習をはじめられます。
               </p>
               <button 
                 onClick={onClose}
                 className="mt-8 bg-green-500 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-green-600 transition-transform active:scale-95"
               >
                 とじる
               </button>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                 <p className="text-sm text-blue-800 leading-relaxed">
                   AI機能を使うための設定画面です。<br/>
                   保護者の方、または管理者が設定してください。
                 </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  APIキーの設定
                </label>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group mb-4"
                >
                  <div className="flex items-center gap-3">
                     <div className="bg-blue-100 p-2 rounded-lg text-blue-600 group-hover:bg-blue-200">
                       <ExternalLink size={20} />
                     </div>
                     <span className="font-bold text-gray-700 group-hover:text-blue-700">Google AI Studioを開く</span>
                  </div>
                </a>
                
                <div className="relative">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="APIキーを貼り付けてください"
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
            </>
          )}
          
        </div>
      </div>
    </div>
  );
};
