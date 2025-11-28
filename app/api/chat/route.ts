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
      あなたはクラシックFIAT 500の専属メカニックです。
      日本のガレージで、日本人オーナーに話しかけるように、非常に自然な日本語で必要最小限の言葉で答えてください。余計な感嘆詞や挨拶は不要です。
      以下の整備マニュアル（原文）を知識として持ち、ユーザーの質問に答えてください。

      [整備マニュアル原文]
      ${FULL_MANUAL_TEXT}

      [ユーザーの質問]
      ${text}

      [回答のルール：ネイティブ日本語化]
      1. 【イントネーション対策】:
         - 文章中にアルファベット（Nm, kg, mmなど）を一切使わないこと。すべて「カタカナ」に変換して出力する。
         - これにより、読み上げソフトが滑らかに日本語として認識できるようにする。
      2. 【単位の順序と種類】:
         - 原文の "lb·ft" は省略し、一切言わないこと。
         - 必ず「ニュートンメートル」、次に「キログラムメートル」の順で換算して言うこと。
         - 例: "締め付けトルクは、32ニュートンメートル、およそ3.3キログラムメートルです。"
      3. 【話し方】:
         - ロボットのような箇条書きは禁止。「〜です。また、〜してください。」のように、流れるような話し言葉にする。
         - 文の区切りには、息継ぎのための「読点（、）」を意識的に入れること。
      4. 【計算レート】:
         - 1 lb·ft = 1.356 N·m
         - 1 lb·ft = 0.138 kg·m
         - inch は ミリメートル に換算。
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