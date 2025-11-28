"use client";

import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isHandsFree, setIsHandsFree] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).webkitSpeechRecognition) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.lang = "ja-JP";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);

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

  // ★修正：以前のシンプルな起動方式に戻す
  const startListening = () => {
    window.speechSynthesis.cancel();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // すでに開始している場合は何もしない（自動終了を待つ）
        console.log("Already listening");
      }
    } else {
      alert("このブラウザは音声認識に対応していません。Google Chrome推奨です。");
    }
  };

  // ★修正：リセット時にマイクも強制キャンセルする機能を追加
  const handleReset = () => {
    setResponse("");       
    setInputText("");      
    window.speechSynthesis.cancel(); // 読み上げ停止
    
    // マイクキャンセル処理
    if (recognitionRef.current) {
      recognitionRef.current.abort(); // stop()ではなくabort()で即座に中断
    }
    setIsListening(false);
  };

  return (
    <main className="h-dvh bg-gray-950 text-white flex flex-col font-sans overflow-hidden">
      
      {/* 1. ヘッダーエリア */}
      <header className="flex-none pt-4 pb-2 px-4 border-b border-red-900/30 bg-gray-950 z-10">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-2xl font-black text-red-600 italic tracking-tighter leading-none">
              FIAT 500
            </h1>
            <p className="text-[10px] text-gray-400 tracking-[0.4em] font-light pl-1">
              POCKET MECHANIC
            </p>
          </div>
          <button
            onClick={() => setIsHandsFree(!isHandsFree)}
            className={`py-2 px-4 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
              isHandsFree 
                ? "bg-red-900/80 text-white border border-red-500 shadow-[0_0_10px_rgba(220,38,38,0.5)]" 
                : "bg-gray-800 text-gray-500 border border-gray-700"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isHandsFree ? "bg-red-500 animate-pulse" : "bg-gray-600"}`}></span>
            HANDS FREE
          </button>
        </div>
      </header>

      {/* 2. メインコンテンツエリア */}
      <div className="flex-grow flex flex-col p-4 overflow-y-auto min-h-0">
        
        {/* AI回答表示 */}
        <div className="flex-grow flex flex-col justify-center mb-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-red-500 animate-pulse text-sm font-bold tracking-widest">
                SEARCHING...
              </div>
            </div>
          ) : response ? (
            <div className="bg-gray-900 p-4 rounded-xl border-l-4 border-red-600 shadow-2xl relative">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs text-red-500 font-bold uppercase tracking-widest">ANSWER</p>
                <button 
                  onClick={() => speak(response)}
                  className="p-2 -mt-2 -mr-2 text-gray-400 hover:text-red-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </button>
              </div>
              <p className="text-lg font-medium leading-relaxed text-gray-100">
                {response}
              </p>
            </div>
          ) : (
            <div className="text-center text-gray-800 opacity-30 select-none flex flex-col items-center justify-center h-full">
              <p className="text-8xl font-black tracking-tighter">500</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. 操作エリア */}
      <div className="flex-none p-4 bg-gray-950 border-t border-gray-900">
        
        {/* テキスト入力 */}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="またはテキストで質問..."
          className="w-full bg-gray-900 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-red-600 outline-none mb-3 text-base"
          onKeyDown={(e) => e.key === "Enter" && handleSend(inputText)}
        />

        {/* ボタン列 */}
        <div className="flex gap-3 mb-4 h-12">
          {/* クリアボタン：押すとリセット＋マイクキャンセル */}
          <button 
            onClick={handleReset}
            className="flex-1 bg-gray-800 text-gray-400 rounded-lg font-bold border border-gray-700 hover:bg-gray-700 hover:text-white transition-colors flex items-center justify-center gap-2 active:scale-95"
          >
            <span className="text-lg">↺</span> クリア
          </button>
          
          <button
            onClick={() => handleSend(inputText)}
            disabled={!inputText || isLoading}
            className="flex-1 bg-gray-200 text-gray-900 rounded-lg font-bold border border-white hover:bg-white transition-colors disabled:opacity-50 disabled:bg-gray-800 disabled:text-gray-600 active:scale-95 shadow-[0_0_10px_rgba(255,255,255,0.2)]"
          >
            送信 ➤
          </button>
        </div>

        {/* 巨大マイクボタン：押すだけ（停止は自動） */}
        <button
          onClick={startListening}
          className={`w-full h-32 rounded-2xl flex flex-col items-center justify-center shadow-lg transition-all border relative overflow-hidden ${
            isListening 
              ? "bg-red-600 border-red-400 animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.6)]" 
              : "bg-gradient-to-b from-red-700 to-red-900 border-red-500/30 active:scale-[0.98]"
          }`}
        >
          {isListening ? (
            <div className="flex items-center gap-1 mb-2">
              <span className="block w-2 h-8 bg-white rounded-full animate-[bounce_1s_infinite]"></span>
              <span className="block w-2 h-12 bg-white rounded-full animate-[bounce_1s_infinite_0.1s]"></span>
              <span className="block w-2 h-8 bg-white rounded-full animate-[bounce_1s_infinite_0.2s]"></span>
            </div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
          
          <span className="text-xl font-bold text-white tracking-widest relative z-10">
            {/* ★修正：タップで完了を削除し、状態表示のみに */}
            {isListening ? "聞き取り中..." : "音声で質問"}
          </span>
        </button>
      </div>
    </main>
  );
}