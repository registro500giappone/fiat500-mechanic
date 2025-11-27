import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import * as fs from 'fs';
import * as path from 'path';

// 1. Google APIキーの取得
const apiKey = process.env.GOOGLE_API_KEY;

// 2. マニュアルデータのロード（publicフォルダから確実に読み込むように修正）
const loadManualData = () => {
  // サーバー実行時のカレントディレクトリ（process.cwd()）からpublicフォルダの絶対パスを構築
  const rootDir = process.cwd();
  const filePath = path.join(rootDir, 'public', 'manual.json'); // ★publicフォルダ直下を参照

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    // JSON文字列をパースして返す
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("❌ マニュアルデータの読み込みに失敗しました:", error);
    // Vercelでデータが見つからなかった場合、クラッシュを防ぐために空配列を返す
    return [];
  }
};

const manualData = loadManualData();

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      return NextResponse.json({ reply: "システムエラー: 鍵（APIキー）が設定されていません。" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const { text } = await req.json();

    // 検索ロジック (データが空ならエラーを返す)
    if (manualData.length === 0) {
        return NextResponse.json({ reply: "すみません、マニュアルデータがサーバー上で見つかりません。管理者にご連絡ください。" });
    }

    const keywords = text.split(/[\s,、。?？]+/).filter((k: string) => k.length > 1);
    
    const scoredSections = manualData.map((section: any) => {
      let score = 0;
      const content = section.title + section.text;
      keywords.forEach((k) => {
        if (content.includes(k)) score += 1;
      });
      return { ...section, score };
    });

    const relevantSections = scoredSections
      .filter((s: any) => s.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 5);

    const contextDocs = relevantSections.length > 0 ? relevantSections : manualData.slice(0, 20);
    
    const contextText = contextDocs.map((doc: any) => 
      `【${doc.title}】\n${doc.text}`
    ).join("\n\n");

    const prompt = `
      あなたはクラシックFIAT 500の熟練メカニックAIです。
      以下の「整備マニュアル（抜粋）」の内容を根拠にして、ユーザーの質問に答えてください。
      
      [マニュアル抜粋]
      ${contextText}

      [ユーザーの質問]
      ${text}

      [回答のルール]
      1. 結論から短く簡潔に話すこと。
      2. マニュアルにある「lb·ft」の数値は、必ず「kg-m」と「N·m」に換算して併記すること。
         - 1 lb·ft = 0.138 kg-m
         - 1 lb·ft = 1.356 N·m
      3. インチ(inch)はミリ(mm)に換算すること。
      4. マニュアルに載っていないことは正直に「わかりません」と答えること。
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponseText = response.text;

    return NextResponse.json({ reply: aiResponseText });

  } catch (error) {
    console.error("❌ AIまたはシステムエラー詳細:", error);
    return NextResponse.json({ reply: "AIの通信エラーが発生しました。Google側の問題か、APIキーの設定に誤りがあります。" }, { status: 500 });
  }
}