"use client";

import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHandsFree, setIsHandsFree] = useState(false);
  const recognitionRef = useRef<any>(null);

  // マイクのセットアップ（初回のみ）
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).webkitSpeechRecognition) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.lang = "ja-JP";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleSend(transcript);
      };

      recognitionRef.current = recognition;
    }
  }, [isHandsFree]);

  const handleSend = async (text: string) => {
    if (!text) return;
    setIsLoading(true);
    setResponse(""); // 前の回答を消す

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setResponse(data.reply);
      speak(data.reply);
    } catch (error) {
      setResponse("すみません、エラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel(); // 前の声を止める
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    // 少しゆっくり、低めに読むと落ち着いて聞こえます
    utterance.rate = 1.0; 
    utterance.pitch = 1.0;
    
    utterance.onend = () => {
      // ハンズフリーモードなら、読み上げ後に自動でマイクON
      if (isHandsFree && recognitionRef.current) {
        setTimeout(() => recognitionRef.current.start(), 500);
      }
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    window.speechSynthesis.cancel(); // 自分が喋る時はAIを黙らせる
    if (recognitionRef.current) {
      recognitionRef.current.start();
    } else {
      alert("このブラウザは音声認識に対応していません。Google Chrome推奨です。");
    }
  };

  // ★追加機能：リセット処理
  const handleReset = () => {
    setResponse("");       // 画面の文字を消す
    setInputText("");      // 入力欄を消す
    window.speechSynthesis.cancel(); // 音声を強制停止
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 flex flex-col max-w-md mx-auto">
      {/* ヘッダー */}
      <header className="flex justify-between items-center mb-6 border-b border-gray-700 pb-2">
        <h1 className="text-xl font-bold text-yellow-500">Fiat 500 Mechanic</h1>
        <button
          onClick={() => setIsHandsFree(!isHandsFree)}
          className={`text-xs px-3 py-1 rounded-full border ${
            isHandsFree ? "bg-green-600 border-green-500 text-white" : "bg-gray-800 border-gray-600 text-gray-400"
          }`}
        >
          ハンズフリー: {isHandsFree ? "ON" : "OFF"}
        </button>
      </header>

      {/* AI回答エリア */}
      <div className="flex-grow mb-4 flex flex-col justify-center min-h-[200px]">
        {isLoading ? (
          <div className="text-center text-yellow-300 animate-pulse text-lg">
            🔧 マニュアルを検索中...
          </div>
        ) : response ? (
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
            <p className="text-sm text-yellow-500 mb-2 font-bold">AIの回答:</p>
            <p className="text-lg leading-relaxed">{response}</p>
            
            {/* ★ここに追加：リセットボタン */}
            <button 
              onClick={handleReset}
              className="mt-6 w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md border border-gray-500 flex items-center justify-center gap-2 transition-colors"
            >
              <span className="text-xl">↺</span> 次の質問へ
            </button>
          </div>
        ) : (
          <div className="text-center text-gray-500">
            <p className="text-6xl mb-4">FIAT</p>
            <p>下のマイクボタンを押して<br/>質問してください</p>
          </div>
        )}
      </div>

      {/* テキスト入力エリア（修正用） */}
      <div className="mb-4">
        <label className="text-xs text-gray-400 mb-1 block">テキスト入力:</label>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="例: ホイールのトルク"
          className="w-full bg-gray-800 text-white p-3 rounded border border-gray-600 focus:border-yellow-500 outline-none"
          onKeyDown={(e) => e.key === "Enter" && handleSend(inputText)}
        />
      </div>

      {/* 送信ボタン */}
      <button
        onClick={() => handleSend(inputText)}
        disabled={!inputText || isLoading}
        className="w-full bg-yellow-600 disabled:bg-gray-700 text-white font-bold py-3 rounded mb-4 hover:bg-yellow-500 transition-colors"
      >
        送信する
      </button>

      {/* 巨大マイクボタン */}
      <button
        onClick={startListening}
        className="w-full h-32 bg-blue-600 hover:bg-blue-500 rounded-xl flex flex-col items-center justify-center shadow-lg active:scale-95 transition-transform"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <span className="text-2xl font-bold text-white">音声で質問</span>
      </button>
    </main>
  );
}