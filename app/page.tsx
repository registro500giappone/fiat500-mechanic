"use client";

import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false); // 聞き取り中フラグ
  const [isHandsFree, setIsHandsFree] = useState(false);
  const recognitionRef = useRef<any>(null);

  // マイクのセットアップ
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).webkitSpeechRecognition) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.lang = "ja-JP";
      recognition.continuous = false;
      recognition.interimResults = false;

      // 聞き取り開始
      recognition.onstart = () => {
        setIsListening(true);
      };

      // 聞き取り終了
      recognition.onend = () => {
        setIsListening(false);
      };

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
      
      // PCならこれで自動再生されますが、スマホはブロックされる可能性があります
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
      // ハンズフリーONなら、読み上げ後にマイクを再起動
      if (isHandsFree && recognitionRef.current) {
        setTimeout(() => recognitionRef.current.start(), 500);
      }
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    window.speechSynthesis.cancel();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // すでに開始している場合のエラーは無視
        console.log("Already listening");
      }
    } else {
      alert("このブラウザは音声認識に対応していません。Google Chrome推奨です。");
    }
  };

  const handleReset = () => {
    setResponse("");       
    setInputText("");      
    window.speechSynthesis.cancel(); 
  };

  return (
    // 上部のパディングを増やし(pt-12)、スマホのノッチ回避
    <main className="min-h-screen bg-gray-950 text-white pt-12 p-4 flex flex-col max-w-md mx-auto font-sans pb-10">
      
      {/* ヘッダーエリア：デザイン刷新 */}
      <header className="flex flex-col items-center gap-4 mb-6 border-b border-red-900/50 pb-6">
        {/* タイトルを大きく、中央寄せ */}
        <div className="text-center">
          <h1 className="text-4xl font-black text-red-600 italic tracking-tighter leading-none mb-1">
            FIAT 500
          </h1>
          <p className="text-sm text-gray-400 tracking-[0.3em] font-light">
            POCKET MECHANIC
          </p>
        </div>

        {/* ハンズフリーボタンを押しやすく巨大化 */}
        <button
          onClick={() => setIsHandsFree(!isHandsFree)}
          className={`w-full py-3 px-6 rounded-lg font-bold transition-all flex items-center justify-center gap-3 ${
            isHandsFree 
              ? "bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.6)] border border-red-400" 
              : "bg-gray-900 text-gray-500 border border-gray-700"
          }`}
        >
          <span className={`w-3 h-3 rounded-full ${isHandsFree ? "bg-white animate-pulse" : "bg-gray-600"}`}></span>
          ハンズフリーモード: {isHandsFree ? "ON" : "OFF"}
        </button>
      </header>

      {/* AI回答エリア */}
      <div className="flex-grow mb-6 flex flex-col justify-center min-h-[240px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-red-500 animate-pulse text-lg font-bold tracking-widest">
              SEARCHING...
            </div>
          </div>
        ) : response ? (
          <div className="bg-gray-900 p-5 rounded-2xl border border-red-600/50 shadow-2xl relative overflow-hidden">
            {/* 左側の赤いバー */}
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-red-500 to-red-800"></div>
            
            <div className="flex justify-between items-start mb-3 pl-2">
              <p className="text-xs text-red-500 font-bold uppercase tracking-widest">ANSWER</p>
              {/* 再生ボタン（スマホ用救済措置） */}
              <button 
                onClick={() => speak(response)}
                className="bg-gray-800 p-2 rounded-full text-red-500 hover:bg-gray-700 border border-gray-700"
                aria-label="読み上げ"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>
            </div>

            <p className="text-xl font-medium leading-relaxed text-gray-100 pl-2 mb-6">
              {response}
            </p>
            
            {/* クリアボタン（文言変更） */}
            <button 
              onClick={handleReset}
              className="w-full py-4 bg-gray-800 active:bg-gray-700 text-gray-300 rounded-xl border border-gray-600 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <span className="text-xl">↺</span> クリア
            </button>
          </div>
        ) : (
          <div className="text-center text-gray-700 opacity-40 select-none">
            <p className="text-9xl font-black tracking-tighter text-gray-800">500</p>
          </div>
        )}
      </div>

      {/* テキスト入力エリア */}
      <div className="mb-3">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="またはテキストで入力..."
          className="w-full bg-gray-900 text-white p-4 rounded-xl border border-gray-800 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-colors text-lg"
          onKeyDown={(e) => e.key === "Enter" && handleSend(inputText)}
        />
      </div>

      {/* 送信ボタン（文言変更） */}
      <button
        onClick={() => handleSend(inputText)}
        disabled={!inputText || isLoading}
        className="w-full bg-gray-800 disabled:opacity-50 text-gray-300 font-bold py-4 rounded-xl mb-6 hover:bg-gray-700 transition-colors border border-gray-700 tracking-widest"
      >
        送信
      </button>

      {/* 巨大マイクボタン（明滅アニメーション追加） */}
      <button
        onClick={startListening}
        className={`w-full h-40 rounded-3xl flex flex-col items-center justify-center shadow-lg transition-all border group relative overflow-hidden ${
          isListening 
            ? "bg-red-600 border-red-400 animate-pulse shadow-[0_0_30px_rgba(220,38,38,0.8)] scale-[1.02]" 
            : "bg-gradient-to-br from-red-700 to-red-900 border-red-500/30 shadow-red-900/40 active:scale-95"
        }`}
      >
        {/* 背景の装飾 */}
        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>

        <svg xmlns="http://www.w3.org/2000/svg" className={`h-16 w-16 mb-3 text-white transition-transform ${isListening ? "scale-125" : "group-hover:scale-110"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <span className="text-2xl font-black text-white tracking-widest relative z-10">
          {isListening ? "聞き取り中..." : "音声で質問"}
        </span>
      </button>
    </main>
  );
}