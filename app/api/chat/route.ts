import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import manualData from "../../data/manual.json";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ reply: "システムエラー: APIキーが設定されていません。" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // ★変更点: 安定版の軽量モデルを指定
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const { text } = await req.json();

    // ★変更点: 全文ではなく、関連するデータだけを抽出するロジックを強化
    const keywords = text.split(/[\s,、。?？]+/).filter((k: string) => k.length > 1);
    
    // 関連度スコアを計算してソート
    const scoredSections = manualData.map((section) => {
      let score = 0;
      const content = section.title + section.text;
      keywords.forEach((k) => {
        if (content.includes(k)) score += 1;
      });
      return { ...section, score };
    });

    // スコアが高い順に上位5件だけを取得（これでデータ量を減らす）
    const relevantSections = scoredSections
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // 関連データが見つからない場合は、カテゴリで広めに探す
    const contextDocs = relevantSections.length > 0 ? relevantSections : manualData.slice(0, 20); // それでもダメなら最初の20件だけ
    
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
    const aiResponseText = response.text();

    return NextResponse.json({ reply: aiResponseText });

  } catch (error) {
    console.error("❌ AIエラー詳細:", error);
    return NextResponse.json({ reply: "すみません、AIが混み合っています。もう一度試してください。" }, { status: 500 });
  }
}