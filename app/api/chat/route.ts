import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
// Node.jsのファイルシステム機能を使うためにインポート
import * as fs from 'fs';
import * as path from 'path';

// 1. Google APIキーの取得
const apiKey = process.env.GOOGLE_API_KEY;

// 2. マニュアルデータのロード（ビルド環境でも確実に読み込めるように修正）
const loadManualData = () => {
  // プロジェクトのルートディレクトリからの絶対パスを構築
  const rootDir = process.cwd();
  const filePath = path.join(rootDir, 'app', 'data', 'manual.json');

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    // JSON文字列をパースして返す
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("❌ マニュアルデータの読み込みに失敗しました:", error);
    // 開発を止めないために空配列を返す
    return [];
  }
};

const manualData = loadManualData();

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      return NextResponse.json({ reply: "システムエラー: 鍵（APIキー）が設定されていません。" });
    }

    // 1. AIの準備 (最新安定版モデルを指定)
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const { text } = await req.json();

    // 2. 検索ロジック (キーワードマッチング)
    const keywords = text.split(/[\s,、。?？]+/).filter((k: string) => k.length > 1);
    
    const scoredSections = manualData.map((section: any) => {
      let score = 0;
      // 型を明確にすることで、コンパイラエラーを防ぐ (Vercelのビルド環境対策)
      const content = section.title + section.text; 
      keywords.forEach((k: string) => {
        if (content.includes(k)) score += 1;
      });
      return { ...section, score };
    });

    const relevantSections = scoredSections
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const contextDocs = relevantSections.length > 0 ? relevantSections : manualData.slice(0, 20);
    
    const contextText = contextDocs.map((doc: any) => 
      `【${doc.title}】\n${doc.text}`
    ).join("\n\n");

    // 3. AIへの命令
    const prompt = `
      あなたはクラシックFIAT 500の熟練メカニックAIです。
      以下の「整備マニュアル（抜粋）」の内容を根拠にして、ユーザーの質問に答えてください。
      ... (プロンプトは省略)
    `;

    // 4. 回答生成
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponseText = response.text;

    return NextResponse.json({ reply: aiResponseText });

  } catch (error) {
    console.error("❌ AIまたはシステムエラー詳細:", error);
    return NextResponse.json({ reply: "すみません、AIまたは通信エラーが発生しました。" }, { status: 500 });
  }
}