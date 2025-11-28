import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import { existsSync } from 'fs';

export async function POST(req: Request) {
  console.log("\n==========================================");
  console.log("🚀 リクエスト受信");

  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ reply: "システムエラー: APIキー設定なし" });
    }

    // マニュアルファイルの読み込み
    const possiblePaths = [
      path.join(process.cwd(), 'app', 'data', 'manual.json'),
      path.join(process.cwd(), 'data', 'manual.json'),
      path.join(process.cwd(), 'public', 'manual.json'),
    ];

    let manualData = [];
    let foundPath = "";

    for (const p of possiblePaths) {
      if (existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (foundPath) {
      const fileContents = await fs.readFile(foundPath, 'utf8');
      manualData = JSON.parse(fileContents);
    } else {
      return NextResponse.json({ reply: "エラー：マニュアルデータが見つかりません。" });
    }

    // 受信データの確認
    const body = await req.json();
    const text = body.text;
    console.log(`🗣️ 質問: "${text}"`);

    // マニュアル検索
    const keywords = text ? text.split(/[\s,、。]+/).filter((k: string) => k.length > 1) : [];
    const relevantSections = manualData.filter((section: any) => {
      const content = (section.title || "") + (section.text || "");
      return keywords.some((k: string) => content.includes(k));
    });
    // ヒットしない場合は、「ホイール」「トルク」などの重要単語が含まれるセクションを優先的に含める、あるいは全データを渡す
    const contextDocs = relevantSections.length > 0 ? relevantSections : manualData;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const contextText = contextDocs.map((doc: any) => 
      `【${doc.title}】\n${doc.text}`
    ).join("\n\n");

    const prompt = `
      あなたはクラシックFIAT 500の熟練メカニックAIです。
      以下の「整備マニュアル」の内容を根拠にして、ユーザーの質問に答えてください。

      [整備マニュアル]
      ${contextText.substring(0, 30000)}

      [ユーザーの質問]
      ${text}

      [回答のルール]
      1. 結論から短く簡潔に話すこと。
      2. 【超重要】音声読み上げのために、すべての単位から記号（・、-、/）を削除すること。
         - "lb·ft" → "lb ft" (ポンド フィート)
         - "N·m" → "N m" (ニュートン メートル)
         - "kg-m" → "kg m" (キログラム メートル)
         - 例: "23.9 lb ft (約 3.3 kg m / 32.4 N m)" とスペースだけで表記する。
      3. マニュアルにある「lb·ft」の数値は、必ず「kg m」と「N m」に換算して併記すること。
         - 1 lb·ft = 0.138 kg m
         - 1 lb·ft = 1.356 N m
      4. インチ(inch)はミリ(mm)に換算すること。
      5. 質問が「ホイールのトルク」に関連する場合、リアサスペンションの章にあるホイールボルトのトルクを回答すること。
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponseText = response.text();

    return NextResponse.json({ reply: aiResponseText });

  } catch (error) {
    console.error("❌ エラー:", error);
    return NextResponse.json({ reply: "システムエラーが発生しました。" }, { status: 500 });
  }
}