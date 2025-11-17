import React from 'react';
import { Delete } from 'lucide-react';

interface NumPadProps {
  onInput: (val: string) => void;
  onDelete: () => void;
}

export const NumPad: React.FC<NumPadProps> = ({ onInput, onDelete }) => {
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0'];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-4 pb-8 rounded-t-3xl z-50">
      <div className="max-w-md mx-auto grid grid-cols-3 gap-3">
        {keys.map((k) => (
          <button
            key={k}
            className={`
              h-14 rounded-2xl text-2xl font-bold shadow-sm active:translate-y-1 transition-transform
              ${k === '0' ? 'col-span-2 bg-blue-50 text-blue-600 border-2 border-blue-100' : 'bg-gray-50 text-gray-700 border-2 border-gray-100'}
            `}
            onClick={() => onInput(k)}
          >
            {k}
          </button>
        ))}
        <button
          className="h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center border-2 border-red-100 active:translate-y-1 transition-transform shadow-sm"
          onClick={onDelete}
        >
          <Delete size={28} />
        </button>
      </div>
    </div>
  );
};