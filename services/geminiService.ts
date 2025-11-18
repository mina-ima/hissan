import { GoogleGenAI, Type } from "@google/genai";
import { MathOperation, Problem, CellData, ExplanationResponse } from "../types";

// 環境変数からキーを取得するヘルパー
const getEnvApiKey = (): string => {
  // 1. Vercel/Viteの設定に合わせて VITE_API_KEY を優先的に探す
  // TypeScriptエラー回避のため any キャストを使用
  try {
    const meta = import.meta as any;
    if (meta && meta.env && meta.env.VITE_API_KEY) {
      return meta.env.VITE_API_KEY;
    }
  } catch (e) {
    // ignore
  }

  // 2. process.env も確認 (バックアップ)
  if (typeof process !== 'undefined' && process.env) {
    // Vercelなどで自動的に割り当てられる場合
    if (process.env.VITE_API_KEY) return process.env.VITE_API_KEY;
    if (process.env.API_KEY) return process.env.API_KEY;
  }
  return "";
}

const getClient = () => {
  // 1. 開発者が設定した環境変数を最優先する
  let apiKey = getEnvApiKey();

  // 2. 環境変数がない場合のみ、ブラウザのローカルストレージを見る (開発中のテスト用など)
  if (!apiKey && typeof window !== 'undefined') {
    apiKey = localStorage.getItem('gemini_api_key') || "";
  }

  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// 外部からキーの状態を確認するための関数
export const hasValidKey = (): boolean => {
  return !!(getEnvApiKey() || (typeof window !== 'undefined' && localStorage.getItem('gemini_api_key')));
};

// システムキー（環境変数）が使われているか確認
export const isUsingSystemKey = (): boolean => {
  return !!getEnvApiKey();
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