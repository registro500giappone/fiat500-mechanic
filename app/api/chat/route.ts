import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
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
      「ハンズフリーの音声読み上げアプリ」として振る舞ってください。
      以下の整備マニュアル（原文）を知識として持ち、ユーザーの質問に答えてください。

      [整備マニュアル原文]
      ${FULL_MANUAL_TEXT}

      [ユーザーの質問]
      ${text}

      [回答のルール：読み上げ特化]
      1. 【話し言葉】: 箇条書き（- や 1. 2.）は使わず、「まず〜、次に〜」のように、ラジオの解説者のような自然な話し言葉でつなげて話すこと。
      2. 【単位の読み方】: 記号は読まれないため、以下のように変換して出力すること。
         - "lb·ft" → "ポンドフィート"
         - "kg-m" → "キロ"
         - "mm" → "ミリ"
         - "inch" → "インチ"
         - 例: "23.9ポンドフィート、およそ 3.3キロ です。"
      3. 【間（ま）】: 読み上げソフトが息継ぎしやすいように、文の区切りには必ず読点（、）や句点（。）を入れること。
      4. 【結論ファースト】: 最初にズバリ答えを言い、その後に補足説明をする構成にすること。
      5. 【数値換算】: 原文の lb·ft は、必ず kg m (キログラムメートル) に換算した値を「およそ〇〇キロ」と言い添えること。
      
      [禁止事項]
      - 記号の「・」「/」「-」などを文中に残さないこと（読み上げが詰まる原因になるため）。
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