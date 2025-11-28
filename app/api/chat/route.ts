import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import { existsSync } from 'fs';

export async function POST(req: Request) {
  console.log("\n==========================================");
  console.log("🚀 リクエスト受信：マニュアルファイルを捜索します...");

  try {
    // 1. APIキーの確認
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ reply: "システムエラー: APIキー設定なし" });
    }

    // 2. マニュアルファイルの「家宅捜索」
    // ありそうな場所をリストアップ
    const possiblePaths = [
      path.join(process.cwd(), 'app', 'data', 'manual.json'), // パターンA
      path.join(process.cwd(), 'data', 'manual.json'),       // パターンB (ルート直下)
      path.join(process.cwd(), 'public', 'manual.json'),     // パターンC (公開フォルダ)
      path.join(process.cwd(), 'src', 'app', 'data', 'manual.json'), // パターンD (src構成)
    ];

    let manualData = [];
    let foundPath = "";

    // 順番に探す
    for (const p of possiblePaths) {
      if (existsSync(p)) {
        foundPath = p;
        break; // 見つかったらループ終了
      }
    }

    if (foundPath) {
      console.log(`✅ 発見しました！: ${foundPath}`);
      const fileContents = await fs.readFile(foundPath, 'utf8');
      manualData = JSON.parse(fileContents);
      console.log(`📚 データ読み込み成功: ${manualData.length} 件`);
    } else {
      console.error("❌ 【緊急】どこを探しても manual.json が見つかりません！");
      console.error("   探した場所リスト:", possiblePaths);
      return NextResponse.json({ reply: "エラー：manual.jsonファイルが行方不明です。プロジェクト内のどこに保存したか確認してください。" });
    }

    // 3. 受信データの確認
    const body = await req.json();
    const text = body.text;
    console.log(`🗣️ ユーザーの質問: "${text}"`);

    // 4. マニュアル検索
    const keywords = text ? text.split(/[\s,、。]+/).filter((k: string) => k.length > 1) : [];
    const relevantSections = manualData.filter((section: any) => {
      const content = (section.title || "") + (section.text || "");
      return keywords.some((k: string) => content.includes(k));
    });
    const contextDocs = relevantSections.length > 0 ? relevantSections : manualData;

    // 5. AIへの命令
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const contextText = contextDocs.map((doc: any) => 
      `【${doc.title}】\n${doc.text}`
    ).join("\n\n");

    const prompt = `
      あなたはクラシックFIAT 500の熟練メカニックAIです。
      以下の「整備マニュアル」の内容だけを根拠にして、ユーザーの質問に答えてください。

      [整備マニュアル]
      ${contextText.substring(0, 30000)}

      [ユーザーの質問]
      ${text}

      [回答のルール]
      1. 結論から短く簡潔に話すこと。
      2. マニュアルにある「lb·ft」の数値は、必ず「kg-m」と「N·m」に換算して併記すること。
         - 1 lb·ft = 0.138 kg-m
         - 1 lb·ft = 1.356 N·m
      3. インチ(inch)はミリ(mm)に換算すること。
      4. 質問が空、または聞き取れない場合は「すみません、うまく聞き取れませんでした」と答えること。
    `;

    // 6. 回答生成
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponseText = response.text();

    return NextResponse.json({ reply: aiResponseText });

  } catch (error) {
    console.error("❌ サーバーエラー:", error);
    return NextResponse.json({ reply: "システムエラーが発生しました。" }, { status: 500 });
  }
}