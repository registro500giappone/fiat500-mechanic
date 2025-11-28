import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
// 相対パスで確実にデータを読み込みます
import { FULL_MANUAL_TEXT } from "../../lib/manual_data";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ reply: "システムエラー: APIキー設定なし" });
    }

    const body = await req.json();
    const text = body.text;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      あなたはクラシックFIAT 500の熟練メカニックAIです。
      以下の「整備マニュアル（原文）」をすべて読み込み、ユーザーの質問に答えてください。

      [整備マニュアル原文]
      ${FULL_MANUAL_TEXT}

      [ユーザーの質問]
      ${text}

      [回答のルール]
      1. 結論から短く簡潔に話すこと。
      2. 【超重要】音声読み上げのため、単位の「中黒（・）」や「スラッシュ（/）」は削除し、スペース区切りにする。
         - 悪い例: 32.5 lb·ft / 4.5 kg-m
         - 良い例: 32.5 lb ft  約 4.5 kg m
      3. マニュアルにある「lb·ft」の数値は、必ず「kg m」と「N m」に換算して併記すること。
         - 1 lb·ft = 0.138 kg m
         - 1 lb·ft = 1.356 N m
      4. インチ(inch)はミリ(mm)に換算して併記すること。
      5. マニュアルの全文から答えを探すこと。特定の章に限定せず、あらゆる可能性を考慮して回答を作成すること。
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponseText = response.text();

    return NextResponse.json({ reply: aiResponseText });

  } catch (error) {
    console.error("❌ エラー:", error);
    return NextResponse.json({ reply: "エラーが発生しました。" }, { status: 500 });
  }
}