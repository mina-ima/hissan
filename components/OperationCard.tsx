import React from 'react';
import { MathOperation } from '../types';
import { Plus, Minus, X, Divide } from 'lucide-react';

interface OperationCardProps {
  operation: MathOperation;
  onClick: (op: MathOperation) => void;
  label: string;
  colorClass: string;
}

export const OperationCard: React.FC<OperationCardProps> = ({ operation, onClick, label, colorClass }) => {
  const getIcon = () => {
    switch (operation) {
      case MathOperation.ADD: return <Plus size={48} strokeWidth={3} />;
      case MathOperation.SUBTRACT: return <Minus size={48} strokeWidth={3} />;
      case MathOperation.MULTIPLY: return <X size={48} strokeWidth={3} />;
      case MathOperation.DIVIDE: return <Divide size={48} strokeWidth={3} />;
    }
  };

  return (
    <button
      onClick={() => onClick(operation)}
      className={`
        ${colorClass} 
        w-full h-40 rounded-3xl shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl
        flex flex-col items-center justify-center text-white gap-2 border-b-8 border-black/10 active:border-b-0 active:translate-y-2
      `}
    >
      <div className="bg-white/20 p-4 rounded-full">
        {getIcon()}
      </div>
      <span className="text-2xl font-bold tracking-widest">{label}</span>
    </button>
  );
};