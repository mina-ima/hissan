
import React, { useState, useEffect, useRef } from 'react';
import { Problem, CellData, MathOperation, AppMode, ExplanationResponse } from '../types';
import { Check, ArrowLeft, RefreshCw, Sparkles, Flame, ArrowRight } from 'lucide-react';
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

  useEffect(() => {
    if (mode !== 'learning' || isCorrect || !activeCell) return;

    const cached = hintCache[activeCell];
    if (cached) {
        setMessage(cached.guide);
        setIsThinking(false);
    } else {
        setIsThinking(true);
        setMessage("先生が考え中...");
        fetchHint(activeCell, inputs).then(hint => {
            setActiveCell(current => {
                if (current === activeCell) {
                    setMessage(hint.guide);
                    setIsThinking(false);
                }
                return current;
            });
        });
    }
  }, [activeCell, mode, isCorrect, problem, layout]);

  const handleInput = (val: string) => {
    if (!activeCell || isCorrect) return;
    
    const targetCell = layout.cells.find(c => c.key === activeCell);
    if (!targetCell) return;

    const newInputs = { ...inputs, [activeCell]: val };
    setInputs(newInputs);

    // Correct value entered for this cell?
    if (val === targetCell.value) {
       
       let isSuccess = false;

       // Generic Success Logic:
       // Check if all REQUIRED (non-carry) input cells are correct.
       // This allows users to skip carry inputs (mental math) or fill them in as they please.
       // For Addition/Multiplication: Carry cells are marked isCarry=true.
       // For Subtraction/Division: All input cells are essential (isCarry is falsy).
       const requiredCells = layout.cells.filter(c => c.type === 'input' && !c.isCarry);
       const isRequiredComplete = requiredCells.every(c => newInputs[c.key] === c.value);

       if (isRequiredComplete) {
          isSuccess = true;
       }

       if (isSuccess) {
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

  const askTeacherManual = async () => {
     if (!activeCell) return;
     setIsThinking(true);
     const hint = await fetchHint(activeCell, inputs);
     setMessage(hint.guide);
     setIsThinking(false);
  };

  const checkAnswer = async () => {
    if (!activeCell) return;
  };

  const handleCellClick = (cell: CellData) => {
    if (cell.type === 'input' && !isCorrect) {
      setActiveCell(cell.key);
    }
  };

  // --- Subtraction Interactive Borrowing ---
  const canBorrow = (colIdx: number): boolean => {
      if (problem.operation !== MathOperation.SUBTRACT) return false;
      // Current effective top value. Must handle undefined during initial render.
      const topVal = topRowValues[colIdx];
      if (topVal === undefined) return false;

      // Bottom value
      const bottomCell = layout.cells.find(c => c.row === 2 && c.col === colIdx && c.type === 'static');
      // If no bottom value, usually it's 0
      const bottomVal = bottomCell ? parseInt(bottomCell.value) : 0;
      
      // Borrow needed if Top < Bottom
      if (topVal >= bottomVal) return false;
      
      // Can only borrow if left neighbor exists and has value > 0
      const leftCol = colIdx - 1;
      const leftVal = topRowValues[leftCol];
      if (leftVal === undefined || leftVal <= 0) return false;
      
      return true;
  };

  const handleBorrow = (targetCol: number) => {
      const sourceCol = targetCol - 1;
      
      // 1. Decrement Source
      // Use fallback 0 just in case, though UI shouldn't allow click if undefined
      const sourceVal = topRowValues[sourceCol] !== undefined ? topRowValues[sourceCol] : 0;
      const newSourceVal = sourceVal - 1;
      
      // 2. Increment Target
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
                 
                 let displayText = cell.value;
                 let isRedText = false;
                 let showDiagonalStrike = false;
                 let helperValue = null;

                 // Arrow Rendering Logic
                 const showBorrowArrow = isSub && isTopRow && canBorrow(cell.col);

                 if (isTopRow) {
                    // Use fallback to initial value if topRowValues is not yet initialized to prevent crash
                    const initialVal = parseInt(cell.value);
                    const currentVal = topRowValues[cell.col] !== undefined ? topRowValues[cell.col] : initialVal;
                    
                    // If the value has changed from the initial state (either borrowed FROM or borrowed INTO)
                    if (currentVal !== initialVal) {
                        // Show the original value crossed out
                        displayText = initialVal.toString();
                        showDiagonalStrike = true;
                        
                        // Show the current effective value (e.g. 2 or 15) in the helper badge
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
                            className="absolute -left-[27px] top-1/2 -translate-y-1/2 z-50 bg-orange-100 hover:bg-orange-200 text-orange-600 rounded-full p-1 shadow-md border border-orange-300 animate-pulse active:scale-90 transition-transform"
                            aria-label="繰り下げる"
                         >
                             <ArrowRight size={16} />
                         </button>
                     )}

                     {/* Helper Value (Between Rows) */}
                     {helperValue !== null && (
                        <div className="absolute left-0 right-0 bottom-0 translate-y-1/2 flex justify-center z-40 pointer-events-none">
                            <span className="text-xs font-bold text-red-500 bg-white px-1.5 py-0.5 rounded-md shadow-sm border border-red-100 leading-none">
                                {helperValue}
                            </span>
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
        <>
           <div className="fixed bottom-[240px] right-4 z-30">
             {mode === 'learning' && (
               <button onClick={askTeacherManual} disabled={isThinking} className="bg-white p-3 rounded-full shadow-lg text-blue-500 hover:bg-blue-50 transition-colors border border-blue-100 mb-3 block">
                 <span className="text-2xl">💡</span>
               </button>
             )}
             {mode === 'practice' && (
                 <button onClick={checkAnswer} className="bg-blue-500 p-4 rounded-full shadow-lg text-white hover:bg-blue-600 transition-colors">
                    <Check size={24} strokeWidth={3} />
                 </button>
             )}
           </div>
          <NumPad onInput={handleInput} onDelete={handleDelete} />
        </>
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
