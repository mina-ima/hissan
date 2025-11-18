
import React, { useState, useEffect, useRef } from 'react';
import { Problem, CellData, MathOperation, AppMode, ExplanationResponse } from '../types';
import { Check, ArrowLeft, RefreshCw, Sparkles, Flame, ArrowRight, Plus, Lightbulb } from 'lucide-react';
import * as GeminiService from '../services/geminiService';
import { generateLayout } from '../utils/hissanLayout';
import { NumPad } from './NumPad';

interface GridInputProps {
  problem: Problem;
  mode: AppMode;
  currentStreak: number;
  practiceCount?: number;
  onBack: () => void;
  onNext: (isPerfect: boolean) => void;
}

// Helper to get digit from layout
const getDigitAt = (cells: CellData[], row: number, col: number): number => {
  const cell = cells.find(c => c.row === row && c.col === col);
  return cell ? parseInt(cell.value) || 0 : 0;
};

export const GridInput: React.FC<GridInputProps> = ({ problem, mode, currentStreak, practiceCount, onBack, onNext }) => {
  const [layout, setLayout] = useState(generateLayout(problem));
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [activeCell, setActiveCell] = useState<string | null>(null);
  
  // Subtraction Borrowing State
  const [topRowValues, setTopRowValues] = useState<Record<number, number>>({});
  const [borrowedCols, setBorrowedCols] = useState<Record<number, boolean>>({}); // Cols that HAVE RECEIVED 10
  
  // Messages
  const [message, setMessage] = useState<string>("");
  const [isThinking, setIsThinking] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [cheer, setCheer] = useState("");
  
  // Mistake Tracking
  const hasMistakeRef = useRef(false);

  const [hintCache, setHintCache] = useState<Record<string, ExplanationResponse>>({});

  const getNextCell = (allCells: CellData[], currentInputs: Record<string, string>, op: MathOperation): string | null => {
    const remaining = allCells.filter(c => {
       if (c.type !== 'input') return false;
       const val = currentInputs[c.key];
       return val !== c.value; 
    });

    if (remaining.length === 0) return null;

    return remaining.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
      }
      if (op === MathOperation.DIVIDE) {
         if (a.row !== b.row) return a.row - b.row;
         return a.col - b.col;
      }
      if (op === MathOperation.MULTIPLY) {
         if (a.row !== b.row) return a.row - b.row;
         return b.col - a.col;
      }
      if (a.col !== b.col) return b.col - a.col;
      return a.row - b.row;
    })[0].key;
  };

  const fetchHint = async (targetKey: string, currentInputs: Record<string, string>) => {
     const hint = await GeminiService.getMathExplanation(problem, layout.cells, currentInputs, targetKey);
     setHintCache(prev => ({ ...prev, [targetKey]: hint }));
     return hint;
  };

  // Reset state when problem changes
  useEffect(() => {
    const newLayout = generateLayout(problem);
    setLayout(newLayout);
    setInputs({});
    setMessage("");
    setIsCorrect(false);
    setCheer("");
    setHintCache({});
    setBorrowedCols({});
    hasMistakeRef.current = false;

    // Initialize top row values for subtraction
    if (problem.operation === MathOperation.SUBTRACT) {
      const topVals: Record<number, number> = {};
      newLayout.cells
        .filter(c => c.row === 1 && c.type === 'static')
        .forEach(c => {
          topVals[c.col] = parseInt(c.value);
        });
      setTopRowValues(topVals);
    }
    
    const startKey = getNextCell(newLayout.cells, {}, problem.operation);
    setActiveCell(startKey);
  }, [problem]);

  // 【変更点】自動でAPIを呼ばないように変更
  // activeCellが変わっただけでは、「ヒントボタンを押してね」というローカルメッセージを出す
  useEffect(() => {
    if (mode !== 'learning' || isCorrect || !activeCell) return;

    const cached = hintCache[activeCell];
    if (cached) {
        setMessage(cached.guide);
    } else {
        // APIを節約するため、最初は汎用的なメッセージを表示
        setMessage("計算してみよう！わからなかったら「ヒント」ボタンを押してね");
    }
  }, [activeCell, mode, isCorrect, problem, layout]);

  const handleInput = (val: string) => {
    if (!activeCell || isCorrect) return;
    
    const targetCell = layout.cells.find(c => c.key === activeCell);
    if (!targetCell) return;

    const newInputs = { ...inputs, [activeCell]: val };
    setInputs(newInputs);

    if (val === targetCell.value) {
       const requiredCells = layout.cells.filter(c => c.type === 'input' && !c.isCarry);
       const isRequiredComplete = requiredCells.every(c => newInputs[c.key] === c.value);

       if (isRequiredComplete) {
          setIsCorrect(true);
          setActiveCell(null);
          setMessage("かんぺき！すごい！");
          GeminiService.getCheerMessage().then(setCheer);
       } else {
          const nextKey = getNextCell(layout.cells, newInputs, problem.operation);
          setActiveCell(nextKey);
       }
    } else {
       hasMistakeRef.current = true;
       // 間違えた場合も、APIは自動で呼ばず、ローカルのキャッシュか汎用メッセージを表示
       const cached = hintCache[activeCell];
       if (cached && cached.errorHint) {
           setMessage(cached.errorHint);
       } else {
           setMessage("おっと！計算間違いかも？もう一度チェック！");
       }
    }
  };

  const handleDelete = () => {
    if (!activeCell || isCorrect) return;
    const newInputs = { ...inputs };
    delete newInputs[activeCell];
    setInputs(newInputs);
    
    const cached = hintCache[activeCell];
    if (cached) {
        setMessage(cached.guide);
    }
  };

  // Keyboard Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCorrect || !activeCell) return;

      if (e.key >= '0' && e.key <= '9') {
        handleInput(e.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCell, isCorrect, inputs, layout, hintCache]);

  // 手動で先生に聞くボタン
  const askTeacherManual = async () => {
     if (!activeCell) return;
     
     // キャッシュがあればそれを使う
     if (hintCache[activeCell]) {
        setMessage(hintCache[activeCell].guide);
        return;
     }

     setIsThinking(true);
     setMessage("先生が考え中...");
     
     // ここで初めてAPIを呼ぶ
     const hint = await fetchHint(activeCell, inputs);
     setMessage(hint.guide);
     setIsThinking(false);
  };

  const checkAnswer = async () => {
    // In practice mode, we can force check. 
  };

  const handleCellClick = (cell: CellData) => {
    if (cell.type === 'input' && !isCorrect) {
      setActiveCell(cell.key);
    }
  };

  // --- Subtraction Interactive Borrowing ---
  const canBorrow = (colIdx: number): boolean => {
      if (problem.operation !== MathOperation.SUBTRACT) return false;
      const topVal = topRowValues[colIdx];
      if (topVal === undefined) return false;

      const bottomCell = layout.cells.find(c => c.row === 2 && c.col === colIdx && c.type === 'static');
      const bottomVal = bottomCell ? parseInt(bottomCell.value) : 0;
      
      if (topVal >= bottomVal) return false;
      
      const leftCol = colIdx - 1;
      const leftVal = topRowValues[leftCol];
      if (leftVal === undefined || leftVal <= 0) return false;
      
      return true;
  };

  const handleBorrow = (targetCol: number) => {
      const sourceCol = targetCol - 1;
      const sourceVal = topRowValues[sourceCol] !== undefined ? topRowValues[sourceCol] : 0;
      const newSourceVal = sourceVal - 1;
      
      const targetVal = topRowValues[targetCol] !== undefined ? topRowValues[targetCol] : 0;
      const newTargetVal = targetVal + 10;
      
      setTopRowValues(prev => ({
          ...prev,
          [sourceCol]: newSourceVal,
          [targetCol]: newTargetVal
      }));
      
      setBorrowedCols(prev => ({
          ...prev,
          [targetCol]: true
      }));
  };

  // Grid Styling
  const gridStyle = {
    gridTemplateColumns: `repeat(${layout.cols}, 54px)`, // Wider columns
    gridTemplateRows: `repeat(${layout.rows}, 72px)`,   // Taller rows to prevent text overlap
  };

  const hasStarted = Object.keys(inputs).length > 0;
  const isLastQuestion = mode === 'practice' && practiceCount === 10;

  return (
    <div className="flex flex-col h-full relative bg-[#fdfbf7]">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-2 bg-[#fdfbf7]/90 backdrop-blur z-30 shadow-sm border-b border-gray-100 relative">
        <button onClick={onBack} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-600 transition-colors z-10">
          <ArrowLeft size={20} />
        </button>
        
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
           <div className="flex items-center gap-1 text-orange-500 font-bold text-sm">
              <Flame size={16} fill={currentStreak > 0 ? "currentColor" : "none"} />
              <span>{currentStreak} / 10</span>
           </div>
           <div className="w-24 h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
              <div 
                className="h-full bg-orange-500 transition-all duration-500 ease-out"
                style={{ width: `${(currentStreak / 10) * 100}%` }}
              />
           </div>
        </div>

        <div className="z-10">
           {mode === 'practice' && practiceCount ? (
               <div className="bg-blue-100 text-blue-600 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm border border-blue-200">
                   {practiceCount}/10
               </div>
           ) : (
               <div className="w-9"></div>
           )}
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-shrink-0 w-full bg-[#fdfbf7] z-20 px-4 py-2 min-h-[90px] flex items-center justify-center relative border-b border-gray-50">
        {mode === 'learning' ? (
            <div className={`
                w-full max-w-lg transition-all duration-300
                ${message ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[-10px]'}
            `}>
                {message && (
                <div className={`
                    bg-white text-gray-700 px-4 py-3 rounded-2xl shadow-sm border-2 border-blue-100 text-sm flex gap-3 items-center
                    ${isThinking ? 'opacity-70' : 'opacity-100'}
                `}>
                    <span className="text-2xl shrink-0">{isThinking ? '🤔' : '👩‍🏫'}</span>
                    <div className="font-medium text-left flex-1 leading-relaxed">
                        {isThinking ? "先生が考え中..." : message}
                    </div>
                </div>
                )}
            </div>
        ) : (
            <div className="text-gray-400 text-sm font-medium">
               {isCorrect ? "よくできました！" : isLastQuestion ? "さいごのもんだい！" : "全問正解をめざそう！"}
            </div>
        )}

        {cheer && (
           <div className="absolute inset-0 flex items-center justify-center bg-[#fdfbf7]/95 z-30 animate-in fade-in duration-200">
              <div className="bg-yellow-100 text-yellow-700 px-6 py-2 rounded-full font-bold text-lg border-2 border-yellow-300 flex items-center gap-2 shadow-sm animate-bounce-slight">
                 <Sparkles size={20} /> {cheer}
              </div>
           </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scroll px-4 pb-80">
        <div className="flex flex-col items-center gap-8 w-full max-w-3xl mx-auto pt-4">
          <div className="flex-shrink-0 mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100 relative z-10 overflow-visible">
             <div className="hissan-grid" style={gridStyle}>
               {layout.cells.map((cell) => {
                 const isInput = cell.type === 'input';
                 const isActive = cell.key === activeCell;
                 const userValue = inputs[cell.key] || "";
                 const isWrong = userValue && userValue !== cell.value;
                 const showStartBadge = !hasStarted && isActive && isInput;
                 const isRightHalf = cell.col >= layout.cols / 2;
                 const badgePosition = isRightHalf ? 'right' : 'left';

                 // Subtraction Logic
                 const isSub = problem.operation === MathOperation.SUBTRACT;
                 const isTopRow = isSub && cell.row === 1 && cell.type === 'static';

                 // Carry Plus Logic
                 const isCarryOp = problem.operation === MathOperation.MULTIPLY || problem.operation === MathOperation.ADD;
                 const showPlus = isCarryOp && cell.isCarry;
                 
                 let displayText = cell.value;
                 let isRedText = false;
                 let showDiagonalStrike = false;
                 let helperValue = null;

                 // Arrow Rendering Logic
                 const showBorrowArrow = isSub && isTopRow && canBorrow(cell.col);

                 if (isTopRow) {
                    const initialVal = parseInt(cell.value);
                    const currentVal = topRowValues[cell.col] !== undefined ? topRowValues[cell.col] : initialVal;
                    
                    if (currentVal !== initialVal) {
                        showDiagonalStrike = true;
                        helperValue = currentVal;
                    }
                 }

                 return (
                   <div
                     key={cell.key}
                     style={{ gridRow: cell.row + 1, gridColumn: cell.col + 1 }}
                     className={`
                       hissan-cell number-font text-3xl select-none relative
                       ${cell.hasLineBelow ? 'subtraction-line' : ''}
                       ${cell.isDivisorLine ? 'division-line-right' : ''}
                       ${cell.isDividendLine ? 'division-line-top' : ''}
                       ${cell.isCarry ? 'text-sm align-bottom h-1/2 mt-auto text-gray-400' : ''}
                       ${showDiagonalStrike ? 'diagonal-strike text-gray-400' : ''}
                     `}
                     onClick={() => handleCellClick(cell)}
                   >
                     {/* Borrow Arrow Button */}
                     {showBorrowArrow && !isCorrect && (
                         <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleBorrow(cell.col);
                            }}
                            className="absolute left-0 -translate-x-1/2 top-1/2 -translate-y-1/2 z-50 bg-white hover:bg-orange-50 text-orange-500 rounded-full w-4 h-4 flex items-center justify-center shadow-sm border border-orange-200 active:scale-90 transition-transform"
                            aria-label="繰り下げる"
                         >
                             <ArrowRight size={10} strokeWidth={3} />
                         </button>
                     )}

                     {/* Helper Value */}
                     {helperValue !== null && (
                        <div className="absolute left-0 right-0 -bottom-[14px] flex justify-center z-40 pointer-events-none">
                            <span className="text-sm font-bold text-red-500 bg-white/90 px-1 py-0.5 rounded-md shadow-sm border border-red-100 leading-none">
                                {helperValue}
                            </span>
                        </div>
                     )}

                     {/* Plus sign */}
                     {showPlus && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-40">
                           <Plus size={10} strokeWidth={3} />
                        </div>
                     )}

                     {cell.isDivisorLine ? (
                       <svg width="100%" height="100%" viewBox="0 0 54 72" style={{overflow: 'visible', position: 'absolute', top:0, left:0, zIndex: 50, pointerEvents: 'none'}}>
                         <path d="M 54 0 Q 40 30 14 65" fill="none" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
                       </svg>
                     ) : isInput ? (
                       <div className={`
                         w-12 h-12 flex items-center justify-center rounded-lg border-2 transition-all relative
                         ${isActive 
                            ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-200/60 z-20 scale-110 shadow-lg' 
                            : 'border-dashed border-gray-300 bg-gray-50/50'}
                         ${isWrong ? 'text-red-500 bg-red-50 border-red-300' : ''}
                         ${!isActive && userValue === cell.value ? 'text-blue-600 border-blue-200 bg-blue-50/30' : ''}
                         ${cell.isCarry ? 'w-8 h-8 text-sm border-gray-200 text-gray-500' : ''}
                       `}>
                         {userValue}
                         {showStartBadge && (
                           <div className={`absolute top-1/2 -translate-y-1/2 z-[60] pointer-events-none
                             ${badgePosition === 'right' ? 'left-full ml-3' : 'right-full mr-3'}
                           `}>
                              <div className={`flex items-center animate-bounce ${badgePosition === 'left' ? 'flex-row-reverse' : ''}`}>
                                 <div className={`w-0 h-0 border-y-[6px] border-y-transparent
                                   ${badgePosition === 'right' ? 'border-r-[8px] border-r-orange-500' : 'border-l-[8px] border-l-orange-500'}
                                 `}></div>
                                 <div className="bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-md whitespace-nowrap">
                                   ここから！
                                 </div>
                              </div>
                           </div>
                         )}
                       </div>
                     ) : (
                       <span className={`relative z-0 flex items-center justify-center w-full h-full ${isRedText ? 'text-red-500 font-bold' : 'text-gray-800'}`}>
                          {displayText}
                       </span>
                     )}
                   </div>
                 );
               })}
             </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      {!isCorrect ? (
        <div className="fixed bottom-6 left-0 right-0 z-50 flex items-stretch justify-center gap-3 pointer-events-none px-2">
           {/* Action Buttons (Left side column) */}
           <div className="flex flex-col justify-between pointer-events-auto pb-1 w-[72px] flex-shrink-0">
             {mode === 'learning' && (
               <button 
                  onClick={askTeacherManual} 
                  disabled={isThinking} 
                  className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold w-[72px] h-[72px] rounded-2xl shadow-lg transition-all border-b-4 border-yellow-600 active:border-b-0 active:translate-y-1 flex flex-col items-center justify-center gap-1 mb-auto"
               >
                 <Lightbulb size={24} strokeWidth={2.5} />
                 <span className="text-xs font-bold">ヒント</span>
               </button>
             )}
             {mode === 'practice' && (
                 <button 
                   onClick={checkAnswer} 
                   className="bg-blue-500 hover:bg-blue-600 text-white font-bold w-[72px] h-[72px] rounded-2xl shadow-lg transition-all border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 flex flex-col items-center justify-center gap-1 mt-auto"
                 >
                    <Check size={24} strokeWidth={3} />
                    <span className="text-xs font-bold">判定</span>
                 </button>
             )}
           </div>
          
           {/* Center NumPad */}
           <div className="pointer-events-auto flex-shrink-0">
              <NumPad onInput={handleInput} onDelete={handleDelete} />
           </div>

           {/* Right Spacer (To balance the left buttons and keep NumPad centered) */}
           {/* Hidden on very small screens where space is tight */}
           <div className="w-[72px] flex-shrink-0 hidden min-[450px]:block"></div>
        </div>
      ) : (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50 px-6 pointer-events-auto">
             <button 
               onClick={() => onNext(!hasMistakeRef.current)} 
               className={`
                 w-full max-w-md text-white text-xl font-bold py-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 border-b-4
                 ${isLastQuestion ? 'bg-orange-500 hover:bg-orange-600 border-orange-600' : 'bg-green-500 hover:bg-green-600 border-green-600'}
               `}
             >
                 {isLastQuestion ? "おしまい (もどる)" : "つぎのもんだい"}
                 {isLastQuestion ? <ArrowLeft size={24} /> : <RefreshCw size={24} />}
             </button>
        </div>
      )}
    </div>
  );
};
