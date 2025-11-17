
import React, { useState, useEffect } from 'react';
import { X, Gift, Sparkles } from 'lucide-react';

interface LotteryProps {
  tickets: number;
  onSpin: (points: number) => void;
  onClose: () => void;
}

export const Lottery: React.FC<LotteryProps> = ({ tickets, onSpin, onClose }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentValue, setCurrentValue] = useState(1);
  const [wonPoints, setWonPoints] = useState<number | null>(null);

  const handleSpin = () => {
    if (tickets <= 0 || isSpinning) return;
    
    setIsSpinning(true);
    setWonPoints(null);

    let speed = 50;
    let counter = 0;
    const maxCount = 20; // How many ticks before stopping
    
    // Decelerating spin effect
    const spin = () => {
      // Random number between 1 and 20
      const val = Math.floor(Math.random() * 20) + 1;
      setCurrentValue(val);
      
      counter++;
      
      if (counter < maxCount) {
        // Slow down gradually
        if (counter > 15) speed += 50;
        setTimeout(spin, speed);
      } else {
        // Stop
        setIsSpinning(false);
        setWonPoints(val);
        onSpin(val);
      }
    };

    spin();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-teal-400 p-4 flex items-center justify-between">
          <h3 className="text-white font-bold text-xl flex items-center gap-2">
            <Gift size={24} />
            ラッキーくじ引き
          </h3>
          <button onClick={onClose} disabled={isSpinning} className="bg-white/20 p-2 rounded-full text-white hover:bg-white/30 disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center gap-6 text-center bg-gradient-to-b from-teal-50 to-white">
          
          {/* Ticket Counter */}
          <div className="bg-yellow-100 text-yellow-800 px-4 py-1 rounded-full font-bold text-sm border border-yellow-200">
            くじ引き券: {tickets} まい
          </div>

          {/* The Wheel / Number Display */}
          <div className={`
            w-48 h-48 rounded-full border-[8px] flex items-center justify-center text-6xl font-black shadow-inner bg-white
            ${isSpinning ? 'border-teal-300 text-teal-500' : wonPoints ? 'border-yellow-400 text-yellow-500 scale-110 transition-transform' : 'border-gray-200 text-gray-300'}
          `}>
             {currentValue}
             <span className="text-lg font-normal ml-1 mt-4">pt</span>
          </div>

          {/* Message */}
          <div className="h-8 font-bold text-lg text-gray-600">
             {isSpinning ? "どれがあたるかな...？" : wonPoints ? `やった！ ${wonPoints}ポイント GET!` : "1〜20ポイントがあたるよ！"}
          </div>

          {/* Spin Button */}
          {!wonPoints ? (
            <button 
                onClick={handleSpin} 
                disabled={tickets === 0 || isSpinning}
                className={`
                    w-full py-4 rounded-2xl text-xl font-bold text-white shadow-lg transform transition-all active:scale-95
                    ${tickets > 0 ? 'bg-gradient-to-r from-teal-400 to-emerald-400 hover:shadow-xl hover:-translate-y-1' : 'bg-gray-300 cursor-not-allowed'}
                `}
            >
                {tickets > 0 ? 'くじを引く！' : '券が足りないよ'}
            </button>
          ) : (
            <button 
                onClick={onClose}
                className="w-full py-4 rounded-2xl text-xl font-bold text-white bg-yellow-400 shadow-lg hover:bg-yellow-500 active:scale-95 animate-bounce"
            >
                OK!
            </button>
          )}
          
        </div>
        
        {/* Victory Particles (Simple CSS implementation) */}
        {wonPoints && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
                <div className="absolute top-10 left-10 text-yellow-400 animate-spin-slow"><Sparkles size={30} /></div>
                <div className="absolute bottom-20 right-10 text-orange-400 animate-bounce"><Sparkles size={24} /></div>
                <div className="absolute top-1/2 left-1/4 text-pink-400 animate-pulse"><Sparkles size={40} /></div>
            </div>
        )}
      </div>
    </div>
  );
};
