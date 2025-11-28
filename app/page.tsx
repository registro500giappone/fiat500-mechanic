"use client";

import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHandsFree, setIsHandsFree] = useState(false);
  const recognitionRef = useRef<any>(null);

  // マイクのセットアップ
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
    setResponse(""); 

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
    window.speechSynthesis.cancel(); 
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 1.0; 
    utterance.pitch = 1.0;
    
    utterance.onend = () => {
      if (isHandsFree && recognitionRef.current) {
        setTimeout(() => recognitionRef.current.start(), 500);
      }
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    window.speechSynthesis.cancel();
    if (recognitionRef.current) {
      recognitionRef.current.start();
    } else {
      alert("このブラウザは音声認識に対応していません。Google Chrome推奨です。");
    }
  };

  // リセットボタンの動作
  const handleReset = () => {
    setResponse("");       
    setInputText("");      
    window.speechSynthesis.cancel(); 
  };

  return (
    // 背景をより深い黒（gray-950）に変更し、引き締まった印象に
    <main className="min-h-screen bg-gray-950 text-white p-4 flex flex-col max-w-md mx-auto font-sans">
      
      {/* ヘッダー: アバルトレッドのアクセント */}
      <header className="flex justify-between items-center mb-6 border-b border-red-900/50 pb-2">
        <h1 className="text-xl font-bold text-red-600 tracking-wider italic">
          FIAT 500 <span className="text-white not-italic text-xs">Mechanic</span>
        </h1>
        <button
          onClick={() => setIsHandsFree(!isHandsFree)}
          className={`text-xs px-3 py-1 rounded-full border transition-all ${
            isHandsFree 
              ? "bg-red-600 border-red-500 text-white font-bold shadow-[0_0_10px_rgba(220,38,38,0.5)]" 
              : "bg-gray-900 border-gray-700 text-gray-500"
          }`}
        >
          HANDS FREE: {isHandsFree ? "ON" : "OFF"}
        </button>
      </header>

      {/* AI回答エリア */}
      <div className="flex-grow mb-4 flex flex-col justify-center min-h-[200px]">
        {isLoading ? (
          <div className="text-center text-red-500 animate-pulse text-lg font-bold">
            SEARCHING MANUAL...
          </div>
        ) : response ? (
          <div className="bg-gray-900 p-6 rounded-xl border border-red-900/30 shadow-2xl relative overflow-hidden">
            {/* 装飾用の赤いライン */}
            <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
            
            <p className="text-xs text-red-500 mb-2 font-bold uppercase tracking-widest">Answer</p>
            <p className="text-lg leading-relaxed text-gray-100">{response}</p>
            
            {/* ★次の質問へボタン（今回は確実に入っています） */}
            <button 
              onClick={handleReset}
              className="mt-6 w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-600 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span className="text-lg">↺</span> 次の作業へ（クリア）
            </button>
          </div>
        ) : (
          <div className="text-center text-gray-600 opacity-50">
            <p className="text-8xl font-black mb-2 tracking-tighter text-gray-800 select-none">500</p>
            <p className="text-sm font-light">TAP MIC TO START</p>
          </div>
        )}
      </div>

      {/* テキスト入力エリア */}
      <div className="mb-3">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="例: ホイールのトルク"
          className="w-full bg-gray-900 text-white p-4 rounded-lg border border-gray-800 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-colors"
          onKeyDown={(e) => e.key === "Enter" && handleSend(inputText)}
        />
      </div>

      {/* 送信ボタン（控えめなダークグレー） */}
      <button
        onClick={() => handleSend(inputText)}
        disabled={!inputText || isLoading}
        className="w-full bg-gray-800 disabled:opacity-50 text-gray-300 font-bold py-3 rounded-lg mb-4 hover:bg-gray-700 transition-colors border border-gray-700"
      >
        SEND TEXT
      </button>

      {/* 巨大マイクボタン（アバルトレッド！） */}
      <button
        onClick={startListening}
        className="w-full h-32 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-red-900/20 active:scale-95 transition-all border border-red-500/30 group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-white group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <span className="text-xl font-bold text-white tracking-widest">音声で質問</span>
      </button>
    </main>
  );
}