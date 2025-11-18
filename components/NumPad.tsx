
import React from 'react';
import { Delete } from 'lucide-react';

interface NumPadProps {
  onInput: (val: string) => void;
  onDelete: () => void;
}

export const NumPad: React.FC<NumPadProps> = ({ onInput, onDelete }) => {
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0'];

  return (
    <div className="bg-white shadow-[0_10px_40px_rgba(0,0,0,0.12)] p-3 rounded-[28px] border border-gray-100 pointer-events-auto">
      <div className="grid grid-cols-3 gap-2 w-[260px]">
        {keys.map((k) => (
          <button
            key={k}
            className={`
              h-12 rounded-2xl text-2xl font-bold number-font shadow-sm transition-all active:scale-95 active:translate-y-1 touch-manipulation
              ${k === '0' 
                ? 'col-span-2 bg-blue-50 text-blue-600 border-b-4 border-blue-100 active:border-b-0' 
                : 'bg-gray-50 text-gray-700 border-b-4 border-gray-200 active:border-b-0'
              }
            `}
            onClick={() => onInput(k)}
          >
            {k}
          </button>
        ))}
        <button
          className="h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center border-b-4 border-red-100 active:border-b-0 active:translate-y-1 transition-all shadow-sm active:scale-95"
          onClick={onDelete}
        >
          <Delete size={24} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
