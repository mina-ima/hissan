
import React, { useState, useEffect } from 'react';
import { OperationCard } from './components/OperationCard';
import { GridInput } from './components/GridInput';
import { Lottery } from './components/Lottery';
import { SettingsModal } from './components/SettingsModal';
import { MathOperation, Problem, AppMode } from './types';
import { ArrowLeft, BookOpen, Dumbbell, Gift, Star, Ticket, TrendingUp, Settings } from 'lucide-react';

const STORAGE_KEY = 'hissan_master_save_data_v1';

const generateProblem = (op: MathOperation, mode: AppMode, level: number): Problem => {
  const id = Math.random().toString(36).substr(2, 9);
  let num1 = 0, num2 = 0;
  const isLearning = mode === 'learning';
  
  // Difficulty Multiplier: Increases number ranges based on level
  // Level 0 = Base, Level 1 = +20-50% range, etc.
  const lvlMult = 1 + (level * 0.2);
  const add = level * 10;

  switch (op) {
    case MathOperation.ADD:
      if (isLearning) {
        // Base: 10-90
        const max = Math.floor(80 * lvlMult) + add;
        num1 = Math.floor(Math.random() * max) + 10; 
        num2 = Math.floor(Math.random() * max) + 10;
      } else {
        // Base: 100-990
        // Level up pushes into 4 digits eventually
        const max = Math.floor(890 * lvlMult);
        const min = 100 + (level * 50);
        num1 = Math.floor(Math.random() * max) + min;
        num2 = Math.floor(Math.random() * max) + min;
      }
      break;
    case MathOperation.SUBTRACT:
      if (isLearning) {
        // Base: 20-100
        const max = Math.floor(80 * lvlMult) + add;
        num1 = Math.floor(Math.random() * max) + 20;
        num2 = Math.floor(Math.random() * (num1 - 10)) + 5;
      } else {
        // Base: 200-1000
        const max = Math.floor(800 * lvlMult);
        const min = 200 + (level * 50);
        num1 = Math.floor(Math.random() * max) + min;
        num2 = Math.floor(Math.random() * (num1 - 50)) + 10;
      }
      break;
    case MathOperation.MULTIPLY:
      if (isLearning) {
        // Base: 2-digit * 1-digit
        // Higher levels: Larger 2-digit
        const max1 = Math.floor(80 * lvlMult);
        num1 = Math.floor(Math.random() * max1) + 10;
        
        // Keep multiplier simple for learning, but maybe expand slightly
        const max2 = 4 + Math.floor(level * 0.5); 
        num2 = Math.floor(Math.random() * max2) + 2;
      } else {
        // Base: 2-3 digit * 1 digit
        const max1 = Math.floor(90 * lvlMult) + (level * 20);
        num1 = Math.floor(Math.random() * max1) + 10;
        
        // Slowly introduce larger single digits or small double digits
        const max2 = 8 + Math.floor(level * 1);
        num2 = Math.floor(Math.random() * max2) + 2;
      }
      break;
    case MathOperation.DIVIDE:
      if (isLearning) {
         // Increase quotient size
         const qMax = 8 + (level * 5);
         const quotient = Math.floor(Math.random() * qMax) + 2;
         const divMax = 5 + Math.floor(level * 0.5);
         num2 = Math.floor(Math.random() * divMax) + 2;
         num1 = quotient * num2;
      } else {
         const qMax = 20 + (level * 15); 
         const quotient = Math.floor(Math.random() * qMax) + 2; 
         const divMax = 7 + Math.floor(level * 1); 
         num2 = Math.floor(Math.random() * divMax) + 3; 
         num1 = quotient * num2;
      }
      break;
  }

  return { id, num1, num2, operation: op };
};

const App: React.FC = () => {
  const [selectedOp, setSelectedOp] = useState<MathOperation | null>(null);
  const [mode, setMode] = useState<AppMode | null>(null);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);

  // Load initial state from localStorage
  const loadSavedData = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to load saved data", e);
      return null;
    }
  };

  const savedData = loadSavedData();

  // Gamification State (Persistent)
  const [points, setPoints] = useState(savedData?.points ?? 0);
  const [tickets, setTickets] = useState(savedData?.tickets ?? 0);
  const [difficultyLevel, setDifficultyLevel] = useState(savedData?.difficultyLevel ?? 0);
  const [perfectSets, setPerfectSets] = useState(savedData?.perfectSets ?? 0); // Tracks how many times we hit 10-streak

  // Session State (Non-persistent or persistent per session)
  const [streak, setStreak] = useState(0);
  
  // UI State
  const [showLottery, setShowLottery] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTicketAlert, setShowTicketAlert] = useState(false);
  const [showLevelUpAlert, setShowLevelUpAlert] = useState(false);
  
  // Practice Mode Logic
  const [practiceCount, setPracticeCount] = useState(0);

  // Persist changes to localStorage
  useEffect(() => {
    const dataToSave = {
      points,
      tickets,
      difficultyLevel,
      perfectSets
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [points, tickets, difficultyLevel, perfectSets]);

  const handleOpSelect = (op: MathOperation) => {
    setSelectedOp(op);
    setMode(null);
    setStreak(0);
  };

  const handleModeSelect = (m: AppMode) => {
    setMode(m);
    if (m === 'practice') {
      setPracticeCount(1);
    } else {
      setPracticeCount(0);
    }
    
    if (selectedOp) {
      setCurrentProblem(generateProblem(selectedOp, m, difficultyLevel));
    }
  };

  const handleProblemComplete = (isPerfect: boolean) => {
    if (!selectedOp || !mode) return;

    let nextStreak = streak;
    let nextPerfectSets = perfectSets;
    let nextLevel = difficultyLevel;

    // Streak Logic
    if (isPerfect) {
      nextStreak += 1;
      if (nextStreak >= 10) {
        nextStreak = 0; // Reset streak after reward
        
        // Award Ticket
        setTickets(t => t + 1);
        setShowTicketAlert(true);
        setTimeout(() => setShowTicketAlert(false), 3000);

        // Difficulty Progression: 2 sets of 10 -> Level Up
        nextPerfectSets += 1;
        if (nextPerfectSets >= 2) {
           nextPerfectSets = 0;
           nextLevel += 1;
           setDifficultyLevel(nextLevel);
           setShowLevelUpAlert(true);
           setTimeout(() => setShowLevelUpAlert(false), 3000);
        }
      }
    } else {
      nextStreak = 0; // Reset on mistake
    }
    
    setStreak(nextStreak);
    setPerfectSets(nextPerfectSets);

    // Practice Limit Logic
    if (mode === 'practice') {
      if (practiceCount >= 10) {
        // Finished 10 questions
        setMode(null);
        setCurrentProblem(null);
        setStreak(0); 
        return;
      }
      setPracticeCount(c => c + 1);
    }

    // Next problem with potentially new difficulty level
    setCurrentProblem(generateProblem(selectedOp, mode, nextLevel));
  };

  const handleBackFromGrid = () => {
    setCurrentProblem(null);
    setMode(null); 
    setStreak(0); 
  };

  const handleBackFromMode = () => {
    setSelectedOp(null);
    setMode(null);
  };

  const handleSpinLottery = (wonPoints: number) => {
    setTickets(t => Math.max(0, t - 1));
    setPoints(p => p + wonPoints);
  };

  const getOpLabel = (op: MathOperation) => {
    switch(op) {
      case MathOperation.ADD: return 'たしざん';
      case MathOperation.SUBTRACT: return 'ひきざん';
      case MathOperation.MULTIPLY: return 'かけざん';
      case MathOperation.DIVIDE: return 'わりざん';
    }
  };

  return (
    <div className="min-h-screen w-full max-w-6xl mx-auto bg-[#fdfbf7] relative font-kiwi">
      
      {/* Alerts Container */}
      <div className="fixed top-24 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none">
        {showTicketAlert && (
          <div className="animate-bounce bg-yellow-100 border-4 border-yellow-400 text-yellow-800 px-6 py-3 rounded-3xl shadow-xl flex items-center gap-3 text-lg font-bold">
             <Ticket size={28} />
             <span>10回連続せいかい！くじ引き券ゲット！</span>
          </div>
        )}
        {showLevelUpAlert && (
          <div className="animate-pulse bg-red-100 border-4 border-red-400 text-red-800 px-6 py-3 rounded-3xl shadow-xl flex items-center gap-3 text-lg font-bold">
             <TrendingUp size={28} />
             <span>レベルアップ！もんだいがむずかしくなるよ！</span>
          </div>
        )}
      </div>

      {/* Modals */}
      {showLottery && (
        <Lottery 
          tickets={tickets} 
          onSpin={handleSpinLottery} 
          onClose={() => setShowLottery(false)} 
        />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
      
      {/* Persistent Header Stats */}
      <div className="fixed top-0 right-0 p-4 z-40 flex gap-2 md:gap-3 flex-wrap justify-end items-center pointer-events-none">
         <div className="pointer-events-auto bg-white/80 backdrop-blur border border-yellow-200 rounded-full px-3 py-2 flex items-center gap-2 shadow-sm text-yellow-600 font-bold text-sm md:text-base">
            <Star className="fill-yellow-400 text-yellow-400" size={18} />
            <span>{points} pt</span>
         </div>
         
         {difficultyLevel > 0 && (
            <div className="pointer-events-auto bg-white/80 backdrop-blur border border-red-200 rounded-full px-3 py-2 flex items-center gap-2 shadow-sm text-red-500 font-bold text-sm md:text-base">
                <TrendingUp size={18} />
                <span>Lv.{difficultyLevel + 1}</span>
            </div>
         )}

         <button 
           onClick={() => setShowLottery(true)}
           className={`
             pointer-events-auto rounded-full px-3 py-2 flex items-center gap-2 shadow-sm font-bold transition-transform active:scale-95 text-sm md:text-base
             ${tickets > 0 ? 'bg-gradient-to-r from-teal-400 to-emerald-400 text-white animate-pulse hover:scale-105' : 'bg-gray-100 text-gray-400'}
           `}
         >
            <Gift size={18} />
            <span>くじ引き ({tickets})</span>
         </button>

         <button 
           onClick={() => setShowSettings(true)}
           className="pointer-events-auto bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full p-2 shadow-sm transition-colors"
           title="設定"
         >
            <Settings size={20} />
         </button>
      </div>

      {!selectedOp ? (
        // 1. Operation Selection Screen
        <div className="p-6 min-h-screen flex flex-col max-w-2xl mx-auto">
          <header className="mb-8 text-center pt-12">
            <h1 className="text-4xl font-bold text-gray-800 mb-2 tracking-widest">ひっさん</h1>
            <h2 className="text-2xl font-bold text-blue-500">マスター</h2>
            <p className="text-gray-500 mt-4 text-sm">どの計算を練習する？</p>
          </header>
          
          <div className="grid grid-cols-2 gap-4 flex-1 content-start pb-20">
            <OperationCard 
              operation={MathOperation.ADD} 
              onClick={handleOpSelect} 
              label="たしざん" 
              colorClass="bg-pink-400 hover:bg-pink-500"
            />
            <OperationCard 
              operation={MathOperation.SUBTRACT} 
              onClick={handleOpSelect} 
              label="ひきざん" 
              colorClass="bg-blue-400 hover:bg-blue-500"
            />
            <OperationCard 
              operation={MathOperation.MULTIPLY} 
              onClick={handleOpSelect} 
              label="かけざん" 
              colorClass="bg-orange-400 hover:bg-orange-500"
            />
            <OperationCard 
              operation={MathOperation.DIVIDE} 
              onClick={handleOpSelect} 
              label="わりざん" 
              colorClass="bg-teal-400 hover:bg-teal-500"
            />
          </div>
        </div>
      ) : !currentProblem ? (
        // 2. Mode Selection Screen
        <div className="p-6 min-h-screen flex flex-col max-w-2xl mx-auto">
           <header className="mb-8 pt-4 relative">
             <button 
               onClick={handleBackFromMode}
               className="absolute left-0 top-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"
             >
               <ArrowLeft size={24} />
             </button>
             <div className="text-center mt-2">
                <h2 className="text-3xl font-bold text-gray-800">{getOpLabel(selectedOp)}</h2>
                <p className="text-gray-500 mt-2">モードをえらんでね</p>
                {difficultyLevel > 0 && (
                    <p className="text-red-400 text-xs font-bold mt-1">現在のレベル: {difficultyLevel + 1}</p>
                )}
             </div>
           </header>

           <div className="flex flex-col gap-6 flex-1 justify-center pb-20">
              <button 
                onClick={() => handleModeSelect('learning')}
                className="bg-green-400 hover:bg-green-500 text-white p-8 rounded-3xl shadow-lg transform transition-all active:scale-95 flex items-center gap-6 group"
              >
                 <div className="bg-white/20 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                   <BookOpen size={48} strokeWidth={2.5} />
                 </div>
                 <div className="text-left">
                   <div className="text-2xl font-bold mb-1">がくしゅう</div>
                   <div className="text-green-100 text-sm">先生と一緒にやり方をまなぶ</div>
                 </div>
              </button>

              <button 
                onClick={() => handleModeSelect('practice')}
                className="bg-orange-400 hover:bg-orange-500 text-white p-8 rounded-3xl shadow-lg transform transition-all active:scale-95 flex items-center gap-6 group"
              >
                 <div className="bg-white/20 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                   <Dumbbell size={48} strokeWidth={2.5} />
                 </div>
                 <div className="text-left">
                   <div className="text-2xl font-bold mb-1">れんしゅう</div>
                   <div className="text-orange-100 text-sm">10問チャレンジ！</div>
                 </div>
              </button>
           </div>
        </div>
      ) : (
        // 3. Grid Input Screen
        <GridInput 
          problem={currentProblem} 
          mode={mode!}
          currentStreak={streak}
          practiceCount={practiceCount}
          onBack={handleBackFromGrid} 
          onNext={handleProblemComplete}
        />
      )}
    </div>
  );
};

export default App;
