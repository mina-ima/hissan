
export enum MathOperation {
  ADD = 'ADD',
  SUBTRACT = 'SUBTRACT',
  MULTIPLY = 'MULTIPLY',
  DIVIDE = 'DIVIDE',
}

export type AppMode = 'learning' | 'practice';

export interface Problem {
  num1: number;
  num2: number;
  operation: MathOperation;
  id: string;
}

export interface ExplanationResponse {
  guide: string;      // Explanation before input
  errorHint: string;  // Hint if input is wrong
}

export type CellType = 'static' | 'input' | 'operator' | 'empty';

export interface CellData {
  key: string; // unique key like "r-c"
  row: number;
  col: number;
  value: string; // Expected value
  type: CellType;
  isCarry?: boolean; // Visual styling for carry inputs
  hasLineBelow?: boolean; // For underlines
  isDivisorLine?: boolean; // For the ) symbol
  isDividendLine?: boolean; // For the line above dividend
  order?: number; // Sequence for input focus (1, 2, 3...)
  
  // Subtraction Visuals
  isCrossedOut?: boolean; // Shows a slash through the number
  borrowValue?: string; // The value that appears above after borrowing (e.g. the 4 above a crossed out 5)
  receiveTen?: boolean; // Shows a small 10 (or 1) next to the number to indicate it received value
}

export interface HissanLayout {
  rows: number;
  cols: number;
  cells: CellData[];
}
