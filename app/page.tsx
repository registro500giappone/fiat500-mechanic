'use client';

import { useState, useEffect, useRef } from 'react';

export default function PocketMechanic() {
  // 状態管理
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [inputText, setInputText] = useState('');
  const [response, setResponse] = useState('下のマイクボタンを押すか、文字を入力してください');
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // ハンズフリー設定（デフォルトOFF）
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const handsFreeRef = useRef(false); 

  // 各種機能の参照
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<any>(null);

  // ハンズフリー切り替え
  const toggleHandsFree = () => {
    const newState = !handsFreeMode;
    setHandsFreeMode(newState);
    handsFreeRef.current = newState;
  };

  // 初期化
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'ja-JP';
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const transcriptText = event.results[current][0].transcript;
          setTranscript(transcriptText);
          setInputText(transcriptText);
        };

        recognition.onend = () => {
          setIsListening(false);
          // 音声認識終了後、テキストがあればAI処理へ
          if (transcript) {
            handleAIProcessing(transcript);
          }
        };

        recognitionRef.current = recognition;
      }
      synthRef.current = window.speechSynthesis;
    }
  }, [transcript]); // transcriptの更新を参照

  // マイクのトグル
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      setInputText('');
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        alert("マイクが利用できません。");
      }
      if (synthRef.current?.speaking) synthRef.current.cancel();
    }
  };

  // 送信ボタン
  const handleSend = () => {
    if (!inputText.trim()) return;
    handleAIProcessing(inputText);
  };

  // ★AI処理（本番モード）
  const handleAIProcessing = async (text: string) => {
    if (!text.trim()) return;

    setResponse("考え中..."); // 読み込み中の表示

    try {
      // API（脳みそ）に質問を送信
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();
      const aiAnswer = data.reply || "すみません、うまく聞き取れませんでした。";

      setResponse(aiAnswer);
      speak(aiAnswer);
      
    } catch (error) {
      console.error(error);
      const errorMsg = "通信エラーが発生しました。サーバーが動いているか確認してください。";
      setResponse(errorMsg);
      speak(errorMsg);
    }
  };

  // 読み上げ機能
  const speak = (text: string) => {
    if (!synthRef.current) return;
    if (synthRef.current.speaking) synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 1.2; // 少し早口で
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      
      // ハンズフリーONの場合のみ、自動でマイクを再起動
      if (handsFreeRef.current) {
        setTimeout(() => {
          try {
            setTranscript('');
            recognitionRef.current?.start();
            setIsListening(true);
          } catch (e) {
            console.log("マイク再起動に失敗しました");
          }
        }, 500);
      }
    };

    synthRef.current.speak(utterance);
  };

  return (
    <main className="flex h-screen flex-col bg-neutral-900 text-white overflow-hidden">
      
      {/* ヘッダー */}
      <div className="flex-none w-full flex justify-between items-center px-4 py-3 border-b border-neutral-800 bg-neutral-900 z-10">
        <h1 className="text-lg font-bold text-yellow-500">Fiat 500 Mechanic</h1>
        <button 
          onClick={toggleHandsFree}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-colors duration-200 ${handsFreeMode ? 'bg-green-600 text-white' : 'bg-neutral-700 text-gray-300'}`}
        >
          ハンズフリー: {handsFreeMode ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* メインエリア */}
      <div className="flex-1 flex flex-col min-h-0">
        
        {/* 1/3: AI回答エリア */}
        <div className="flex-1 flex flex-col justify-center bg-neutral-800 p-6 border-b border-neutral-700 overflow-y-auto">
          <p className="text-yellow-500 text-sm mb-2 font-bold">AIの回答:</p>
          <p className="text-2xl leading-relaxed font-medium">
            {/* 数値を赤色で強調表示するロジック */}
            {response.split(/(3\.3キロ|3\.2キロ|32ニュートン|31ニュートン|10度|23\.9|23\.1|18-21|2\.5-2\.9|24-28)/g).map((part, i) => 
              part.match(/(\d+(\.\d+)?(キロ|度|ニュートン)|[0-9.-]+)/) ? 
              <span key={i} className="text-red-500 font-bold text-4xl mx-1">{part}</span> : part
            )}
          </p>
          {isSpeaking && <p className="text-green-400 text-sm mt-4 animate-pulse font-bold">🔊 読み上げ中...</p>}
        </div>

        {/* 1/3: テキスト入力エリア */}
        <div className="flex-1 flex flex-col justify-center p-4 bg-neutral-900/50 border-b border-neutral-800">
          <p className="text-gray-400 text-sm mb-2">テキスト入力:</p>
          <div className="flex flex-col gap-3 h-full">
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="例: コンロッドのトルク"
              className="flex-1 bg-neutral-800 border border-neutral-600 rounded-xl p-4 text-2xl text-white focus:outline-none focus:border-yellow-500 resize-none"
            />
            <button 
              onClick={handleSend}
              className="h-16 bg-yellow-600 rounded-xl font-bold text-2xl hover:bg-yellow-500 text-white active:scale-95 transition-transform flex items-center justify-center shadow-lg"
            >
              送信する
            </button>
          </div>
        </div>

        {/* 1/3: マイクボタンエリア */}
        <div className="flex-1 p-4 bg-neutral-900">
          <button
            onClick={toggleListening}
            className={`w-full h-full rounded-3xl flex flex-col items-center justify-center transition-all duration-200 shadow-lg border-4
              ${isListening 
                ? 'bg-red-900/80 border-red-500 text-white animate-pulse shadow-red-900/50' 
                : 'bg-blue-700 border-blue-500 hover:bg-blue-600 text-white shadow-blue-900/50'
              }`}
          >
            <span className="text-7xl mb-4">{isListening ? '👂' : '🎙️'}</span>
            <span className="text-3xl font-bold tracking-wider">{isListening ? '聞いています...' : '音声で質問'}</span>
          </button>
        </div>

      </div>
    </main>
  );
}