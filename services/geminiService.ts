
import { GoogleGenAI, Type } from "@google/genai";
import { MathOperation, Problem, CellData, ExplanationResponse } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const getMathExplanation = async (
  problem: Problem, 
  cells: CellData[], 
  userInputs: Record<string, string>,
  targetCellKey?: string
): Promise<ExplanationResponse> => {
  const client = getClient();
  // Default fallback
  const fallback: ExplanationResponse = { 
    guide: "さあ、つぎの計算だよ！", 
    errorHint: "あれ？もういちど計算してみよう！" 
  };

  if (!client) return { ...fallback, guide: "APIキーが設定されていません。" };

  const opSymbol = 
    problem.operation === MathOperation.ADD ? '+' :
    problem.operation === MathOperation.SUBTRACT ? '-' :
    problem.operation === MathOperation.MULTIPLY ? '×' : '÷';

  // Construct a text representation of the grid for the AI
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
        // If this is the specific target cell we want advice for, mark it clearly
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
    あなたは登録者数100万人の大人気教育系YouTuber「AI先生」です。
    小学生の視聴者に向けて、算数の筆算をハイテンションで実況解説してください。
    
    【キャラ設定】
    - ポップで親しみやすいお兄さん/お姉さんキャラ。
    - 「さあ、やっていくよ！」「ここは超重要ポイントだ！」など、動画配信のようなリズム感のある口調。
    - 絵文字（✨、🔥、👍など）を適度に使って画面を賑やかにする。
    - 難しい言葉は使わない。

    【状況】
    問題: ${problem.num1} ${opSymbol} ${problem.num2}
    現在の筆算の状態:
    ${gridArt}
    
    [TARGET] と書かれているマスについて、生徒にアドバイスをします。
    
    【出力フォーマット】
    以下のJSON形式で返してください。Markdownのコードブロックは不要です。
    {
      "guide": "入力前の解説。答えそのものは言わず、「7 + 6 はいくつかな？」のように、視聴者に問いかけるスタイル。テンション高く！（60文字以内）",
      "errorHint": "間違えた時のリアクション。「おっと！繰り上がりを忘れてないかい？」「惜しい！もう一度チェックだ！」のように、励ましつつヒントを出す。（40文字以内）"
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
    console.error("Gemini API Error:", error);
    return fallback;
  }
};

export const getCheerMessage = async (): Promise<string> => {
  const client = getClient();
  if (!client) return "すごい！";

  try {
    const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: "小学生が算数の問題を解けました。一言だけで褒めてください。「神！」「天才！」「最高！」など、6文字以内の短い言葉。",
    });
    return response.text?.trim() || "やったね！";
  } catch {
    return "すごい！";
  }
};
