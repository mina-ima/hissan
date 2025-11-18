
import { GoogleGenAI, Type } from "@google/genai";
import { MathOperation, Problem, CellData, ExplanationResponse } from "../types";

const getClient = () => {
  const apiKey = 
    (typeof process !== 'undefined' && process.env && process.env.API_KEY) ||
    (typeof process !== 'undefined' && process.env && process.env.VITE_API_KEY) ||
    (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_KEY) ||
    (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_KEY);

  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// API制限時やオフライン時に返す、計算種類ごとの定型ヒント
const getFallbackExplanation = (op: MathOperation): ExplanationResponse => {
  switch (op) {
    case MathOperation.ADD:
      return { guide: "位をそろえて、足し算しよう！", errorHint: "繰り上がりを忘れてないかな？" };
    case MathOperation.SUBTRACT:
      return { guide: "上の数から下の数を引こう！", errorHint: "引けない時は隣から借りてこよう！" };
    case MathOperation.MULTIPLY:
      return { guide: "九九を使って計算しよう！", errorHint: "九九を思い出して！繰り上がりも足そう。" };
    case MathOperation.DIVIDE:
      return { guide: "たてる・かける・ひく・おろす！", errorHint: "あまりが割る数より大きくないかな？" };
    default:
      return { guide: "さあ、計算してみよう！", errorHint: "あれ？もういちど計算してみよう！" };
  }
};

export const getMathExplanation = async (
  problem: Problem, 
  cells: CellData[], 
  userInputs: Record<string, string>,
  targetCellKey?: string
): Promise<ExplanationResponse> => {
  const client = getClient();
  const fallback = getFallbackExplanation(problem.operation);

  if (!client) {
      // キーがない場合でもエラーにせず、定型文を返す
      return fallback;
  }

  const opSymbol = 
    problem.operation === MathOperation.ADD ? '+' :
    problem.operation === MathOperation.SUBTRACT ? '-' :
    problem.operation === MathOperation.MULTIPLY ? '×' : '÷';

  let gridArt = "";
  const maxRow = Math.max(...cells.map(c => c.row));
  const maxCol = Math.max(...cells.map(c => c.col));

  for (let r = 0; r <= maxRow; r++) {
    let rowStr = "";
    for (let c = 0; c <= maxCol; c++) {
      const cell = cells.find(ce => ce.row === r && ce.col === c);
      if (!cell) {
        rowStr += "[ ]";
      } else {
        if (targetCellKey && cell.key === targetCellKey) {
            rowStr += `[TARGET]`; 
        } else {
            const userVal = userInputs[cell.key] || "";
            if (cell.type === 'input') {
               rowStr += userVal ? `[${userVal}]` : `[?]`;
            } else {
               rowStr += ` ${cell.value} `;
            }
        }
      }
    }
    gridArt += rowStr + "\n";
  }

  const prompt = `
    あなたは小学生に人気のYouTuber「AI先生」です。
    算数の筆算を実況解説してください。
    
    【状況】
    問題: ${problem.num1} ${opSymbol} ${problem.num2}
    筆算の状態:
    ${gridArt}
    
    [TARGET] のマスについてアドバイスをお願いします。
    
    【出力】JSON形式
    {
      "guide": "入力前のヒント。答えは言わず、考え方を短く楽しく。（40文字以内）",
      "errorHint": "間違えた時のヒント。励ます感じで。（30文字以内）"
    }
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                guide: { type: Type.STRING },
                errorHint: { type: Type.STRING }
            },
            required: ["guide", "errorHint"]
        }
      }
    });
    
    const jsonText = response.text;
    if (!jsonText) return fallback;

    const result = JSON.parse(jsonText) as ExplanationResponse;
    return result;

  } catch (error) {
    console.error("Gemini API Error (falling back to local):", error);
    // API制限(429)やネットワークエラーの時は定型文を返す
    return fallback;
  }
};

// API節約のため、褒め言葉はローカルでランダム生成する
const CHEER_WORDS = [
  "すごい！", "天才！", "その調子！", "かっこいい！", "神ってる！", 
  "パーフェクト！", "お見事！", "ナイス！", "最高！", "もってるね！",
  "やるじゃん！", "さすが！", "レベル高い！", "きまってる！"
];

export const getCheerMessage = async (): Promise<string> => {
  // 非同期I/Fを維持しつつ、即座に返す
  const randomWord = CHEER_WORDS[Math.floor(Math.random() * CHEER_WORDS.length)];
  return Promise.resolve(randomWord);
};
