
import { MathOperation, Problem, HissanLayout, CellData } from '../types';

// Helper to create a cell
const createCell = (row: number, col: number, value: string, type: 'static' | 'input' | 'operator' | 'empty', opts: Partial<CellData> = {}): CellData => ({
  key: `${row}-${col}`,
  row,
  col,
  value,
  type,
  ...opts
});

export const generateLayout = (problem: Problem): HissanLayout => {
  const { num1, num2, operation } = problem;
  
  switch (operation) {
    case MathOperation.ADD:
    case MathOperation.SUBTRACT:
      return generateAddSubLayout(num1, num2, operation);
    case MathOperation.MULTIPLY:
      return generateMultiplyLayout(num1, num2);
    case MathOperation.DIVIDE:
      return generateDivisionLayout(num1, num2);
    default:
      return { rows: 0, cols: 0, cells: [] };
  }
};

const generateAddSubLayout = (n1: number, n2: number, op: MathOperation): HissanLayout => {
  const s1 = n1.toString();
  const s2 = n2.toString();
  const result = op === MathOperation.ADD ? n1 + n2 : n1 - n2;
  const sRes = result.toString();
  
  // Width is max length + 1 (for operator)
  const width = Math.max(s1.length, s2.length, sRes.length) + 1;
  const cells: CellData[] = [];
  
  // Row 0: Carries (Addition only - usually empty for subtraction initial state)
  // Row 1: Num 1
  // Row 2: Operator + Num 2
  // Row 3: Result

  // --- ADDITION LOGIC ---
  if (op === MathOperation.ADD) {
     const carries: Record<number, string> = {};
     let c = 0;
     const maxLen = Math.max(s1.length, s2.length);
     for(let i=0; i<maxLen; i++) {
         const d1 = parseInt(s1[s1.length - 1 - i] || '0');
         const d2 = parseInt(s2[s2.length - 1 - i] || '0');
         const sum = d1 + d2 + c;
         c = Math.floor(sum / 10);
         
         if (c > 0) {
             const targetCol = width - 1 - i - 1; 
             if (targetCol >= 0) {
                carries[targetCol] = c.toString();
             }
         }
     }
     for (const colStr in carries) {
         const col = parseInt(colStr);
         cells.push(createCell(0, col, carries[col], 'input', { isCarry: true }));
     }
  }

  // --- SUBTRACTION (Standard Layout) ---
  // We do NOT pre-calculate borrowing visuals here. 
  // Visuals are handled dynamically in GridInput.

  // Row 1: Num 1 (Top Number)
  for (let i = 0; i < s1.length; i++) {
    cells.push(createCell(1, width - s1.length + i, s1[i], 'static'));
  }

  // Row 2: Operator + Num 2
  cells.push(createCell(2, 0, op === MathOperation.ADD ? '+' : '-', 'operator', { hasLineBelow: true }));
  
  const num2StartCol = width - s2.length;
  for (let c = 1; c < num2StartCol; c++) {
    cells.push(createCell(2, c, '', 'empty', { hasLineBelow: true }));
  }

  for (let i = 0; i < s2.length; i++) {
    cells.push(createCell(2, width - 1 - i, s2[s2.length - 1 - i], 'static', { hasLineBelow: true }));
  }

  // Row 3: Result Inputs
  for (let i = 0; i < sRes.length; i++) {
    cells.push(createCell(3, width - 1 - i, sRes[sRes.length - 1 - i], 'input'));
  }

  // Input Ordering
  let currentOrder = 1;
  for (let c = width - 1; c >= 0; c--) {
      const resCell = cells.find(cel => cel.col === c && cel.row === 3 && cel.type === 'input');
      if (resCell) resCell.order = currentOrder++;

      // For addition carry
      const carryCell = cells.find(cel => cel.col === c - 1 && cel.row === 0 && cel.type === 'input');
      if (carryCell) carryCell.order = currentOrder++;
  }

  return { rows: 4, cols: width, cells };
};

const generateMultiplyLayout = (n1: number, n2: number): HissanLayout => {
  const s1 = n1.toString();
  const s2 = n2.toString();
  const result = n1 * n2;
  const width = Math.max(s1.length + s2.length, result.toString().length) + 1;
  const cells: CellData[] = [];
  
  // We now use Row 0 for Carries
  let currentRow = 1; 

  // --- MULTIPLICATION CARRY LOGIC ---
  // Calculate carries for the first partial product (multiplying by ones digit of n2)
  // These carries appear ABOVE the first number (Row 0)
  const carries: Record<number, string> = {};
  const m1 = parseInt(s2[s2.length - 1]); // Ones digit of multiplier
  let currentCarry = 0;
  
  for (let i = 0; i < s1.length; i++) {
      const d1 = parseInt(s1[s1.length - 1 - i]);
      const prod = d1 * m1 + currentCarry;
      currentCarry = Math.floor(prod / 10);
      
      // If there is a carry, it goes to the column LEFT of the current digit
      // Relative to the layout width
      if (currentCarry > 0) {
          const currentDigitCol = width - 1 - i;
          const targetCol = currentDigitCol - 1;
          // Only add carry input if it falls within valid bounds or if we want to show it
          if (targetCol >= 0) {
            carries[targetCol] = currentCarry.toString();
          }
      }
  }
  
  // Row 0: Carries
  for (const colStr in carries) {
      const col = parseInt(colStr);
      cells.push(createCell(0, col, carries[col], 'input', { isCarry: true }));
  }

  // Row 1: Num 1
  for (let i = 0; i < s1.length; i++) {
    cells.push(createCell(currentRow, width - 1 - i, s1[s1.length - 1 - i], 'static'));
  }
  currentRow++;

  // Row 2: Op + Num 2
  cells.push(createCell(currentRow, 0, '×', 'operator', { hasLineBelow: true }));
  
  // Fill gaps
  const num2StartCol = width - s2.length;
  for (let c = 1; c < num2StartCol; c++) {
    cells.push(createCell(currentRow, c, '', 'empty', { hasLineBelow: true }));
  }

  for (let i = 0; i < s2.length; i++) {
    cells.push(createCell(currentRow, width - 1 - i, s2[s2.length - 1 - i], 'static', { hasLineBelow: true }));
  }
  currentRow++;

  let inputOrder = 1;

  if (s2.length === 1) {
      // Direct result - Right to Left
      const sRes = result.toString();
      
      // Create result cells first (without order)
      const resultRowIndex = currentRow;
      for (let i = 0; i < sRes.length; i++) {
          cells.push(createCell(resultRowIndex, width - 1 - i, sRes[sRes.length - 1 - i], 'input'));
      }
      
      // Assign Orders: Result -> Next Carry -> Result -> Next Carry
      // Iterate columns from right to left
      for (let i = 0; i < width; i++) {
          const col = width - 1 - i;
          
          // 1. Result cell at this column
          const resCell = cells.find(c => c.row === resultRowIndex && c.col === col);
          if (resCell) resCell.order = inputOrder++;
          
          // 2. Carry cell generated from this column calculation (appears to the left, col - 1)
          // Check if there is a carry cell at col - 1
          const carryCell = cells.find(c => c.row === 0 && c.col === col - 1);
          if (carryCell) carryCell.order = inputOrder++;
      }
      
      currentRow++;
  } else {
      // Multi-step multiplication
      const resStr = result.toString();
      
      // Partial products
      for (let i = 0; i < s2.length; i++) {
          const digit = parseInt(s2[s2.length - 1 - i]);
          const partial = n1 * digit;
          const sPart = partial.toString();
          
          const isLastPartial = i === s2.length - 1;

          for (let j = 0; j < sPart.length; j++) {
              cells.push(createCell(
                  currentRow, 
                  width - 1 - i - j, 
                  sPart[sPart.length - 1 - j], 
                  'input', 
                  { hasLineBelow: isLastPartial, order: inputOrder++ }
              ));
          }
          
          if (isLastPartial) {
             const startOfNum = width - 1 - i - (sPart.length - 1);
             for (let k = 0; k < startOfNum; k++) {
                 cells.push(createCell(currentRow, k, '', 'empty', { hasLineBelow: true }));
             }
          }
          
          currentRow++;
      }
      
      for (let i = 0; i < resStr.length; i++) {
          cells.push(createCell(currentRow, width - 1 - i, resStr[resStr.length - 1 - i], 'input', { order: inputOrder++ }));
      }
      currentRow++;
  }

  return { rows: currentRow, cols: width, cells };
};

const generateDivisionLayout = (dividend: number, divisor: number): HissanLayout => {
    const sDividend = dividend.toString();
    const sDivisor = divisor.toString();
    const cells: CellData[] = [];
    let inputOrder = 1;
    
    const startCol = sDivisor.length + 1;
    const width = startCol + sDividend.length;
    
    let rowIdx = 2; 
    
    // Row 1: Question setup
    for(let i=0; i<sDivisor.length; i++) {
        cells.push(createCell(1, i, sDivisor[i], 'static'));
    }
    cells.push(createCell(1, sDivisor.length, '', 'operator', { isDivisorLine: true }));
    for(let i=0; i<sDividend.length; i++) {
        cells.push(createCell(1, startCol + i, sDividend[i], 'static', { isDividendLine: true }));
    }

    let tempD = "";
    let processedIndex = 0;
    let quotientStarted = false;
    
    while (processedIndex < sDividend.length) {
        tempD += sDividend[processedIndex];
        let tempVal = parseInt(tempD);
        
        if (tempVal < divisor) {
             if (quotientStarted) {
                 cells.push(createCell(0, startCol + processedIndex, '0', 'input', { order: inputOrder++ }));
             }
             processedIndex++;
             continue;
        }
        
        quotientStarted = true;

        const q = Math.floor(tempVal / divisor);
        const prod = q * divisor;
        const rem = tempVal - prod;
        
        cells.push(createCell(0, startCol + processedIndex, q.toString(), 'input', { order: inputOrder++ }));
        
        const sProd = prod.toString();
        for(let k=0; k<sProd.length; k++) {
            cells.push(createCell(rowIdx, startCol + processedIndex - (sProd.length - 1) + k, sProd[k], 'input', { hasLineBelow: true, order: inputOrder++ }));
        }
        rowIdx++;
        
        const sRem = rem.toString();
        
        if (processedIndex < sDividend.length - 1) {
             const nextDigit = sDividend[processedIndex + 1];
             
             for(let k=0; k<sRem.length; k++) {
                cells.push(createCell(rowIdx, startCol + processedIndex - (sRem.length - 1) + k, sRem[k], 'input', { order: inputOrder++ }));
             }
             
             cells.push(createCell(rowIdx, startCol + processedIndex + 1, nextDigit, 'static'));
             
             rowIdx++;
             
             tempD = rem.toString(); 
             processedIndex++;
        } else {
             for(let k=0; k<sRem.length; k++) {
                 cells.push(createCell(rowIdx, startCol + processedIndex - (sRem.length - 1) + k, sRem[k], 'input', { order: inputOrder++ }));
             }
             rowIdx++;
             processedIndex++;
        }
    }
    
    return { rows: rowIdx + 1, cols: width, cells };
}
