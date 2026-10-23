import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../api/config';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}

const CHAT_STORAGE_KEY = 'emotionai-chat-messages';
const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    text: 'Xin chào! Mình là trợ lý AI của EmotionAI. Mình có thể giúp gì cho bạn?',
    sender: 'ai',
  },
];

function isMessage(value: unknown): value is Message {
  if (typeof value !== 'object' || value === null) return false;
  const message = value as Record<string, unknown>;
  return (
    (typeof message.id === 'number' || typeof message.id === 'string') &&
    typeof message.text === 'string' &&
    (message.sender === 'user' || message.sender === 'ai')
  );
}

function loadChatMessages(): { messages: Message[]; error: string | null } {
  try {
    const stored = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (stored === null) return { messages: INITIAL_MESSAGES, error: null };

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every(isMessage)) {
      throw new Error('Dữ liệu hội thoại đã lưu không hợp lệ.');
    }
    return { messages: parsed, error: null };
  } catch (error) {
    console.error('Không thể khôi phục hội thoại chatbot từ trình duyệt.', error);
    return {
      messages: INITIAL_MESSAGES,
      error: 'Không thể đọc hội thoại đã lưu trên trình duyệt.',
    };
  }
}

export const ChatbotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const [initialChat] = useState(loadChatMessages);
  const [messages, setMessages] = useState<Message[]>(initialChat.messages);
  const [storageError, setStorageError] = useState<string | null>(initialChat.error);
  const [inputValue, setInputValue] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      setStorageError(null);
    } catch (error) {
      console.error('Không thể lưu hội thoại chatbot vào trình duyệt.', error);
      setStorageError('Không thể lưu hội thoại trên trình duyệt này.');
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = inputValue.trim();
    if (!message) return;

    const historyDetailMatch = location.pathname.match(/^\/history\/([^/]+)\/?$/);
    const sessionId = historyDetailMatch?.[1];
    const requestBody = {
      mode: 'dashboard',
      message,
      ...(sessionId
        ? { session_id: sessionId }
        : { source_type: 'all', limit: 20 }),
    };

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text: message, sender: "user" },
    ]);
    setInputValue("");

    try {
      const response = await fetch(`${API_BASE_URL}/chat/emotion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : `Yêu cầu thất bại (HTTP ${response.status})`,
        );
      }

      setMessages((prev) => [
        ...prev,
        { id: Date.now(), text: data.answer, sender: "ai" },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: error instanceof Error
            ? `Không thể nhận phản hồi từ chatbot: ${error.message}`
            : "Không thể kết nối đến chatbot.",
          sender: "ai",
        },
      ]);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* KHUNG CHAT */}
      {isOpen && (
        <div className="w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden mb-4 transition-all animate-in slide-in-from-bottom-5">
          
          {/* Header Chat */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between shadow-sm relative overflow-hidden">
            <div className="absolute top-[-10px] right-[-10px] w-20 h-20 bg-white opacity-10 rounded-full blur-xl"></div>
            
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm p-1.5">
                <img src="/bot-icon.png" alt="EmotionAI" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base flex items-center gap-1">
                  EmotionAI <Sparkles size={14} className="text-amber-300" />
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-blue-100 text-xs font-medium">Đang trực tuyến</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-blue-100 hover:text-white hover:bg-white/20 p-1.5 rounded-full transition-colors relative z-10"
            >
              <X size={20} />
            </button>
          </div>

          {/* Nội dung tin nhắn */}
          <div className="h-80 sm:h-96 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-4">
            {storageError && (
              <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {storageError}
              </p>
            )}
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mr-2 border border-blue-200 p-1">
                     <img src="/bot-icon.png" alt="EmotionAI" className="w-full h-full object-contain" />
                  </div>
                )}
                
                <div className={`${
                  msg.sender === 'user' 
                    ? 'max-w-[75%] rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-2.5 text-sm text-white shadow-sm whitespace-pre-wrap'
                    : 'max-w-[88%] rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm'
                }`}>
                  {msg.sender === 'ai' ? (
                    <div className="space-y-2 leading-relaxed [&>h1]:text-base [&>h1]:font-bold [&>h1]:text-slate-900 [&>h2]:text-base [&>h2]:font-bold [&>h2]:text-slate-900 [&>h3]:text-sm [&>h3]:font-bold [&>h3]:text-blue-900 [&>p]:my-2 [&>ul]:my-2 [&>ul]:list-disc [&>ul]:space-y-1 [&>ul]:pl-5 [&>ol]:my-2 [&>ol]:list-decimal [&>ol]:space-y-1 [&>ol]:pl-5 [&_strong]:font-semibold [&_strong]:text-slate-900 [&_em]:italic [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-400 [&_blockquote]:rounded-r-lg [&_blockquote]:bg-blue-50 [&_blockquote]:px-3 [&_blockquote]:py-2 [&_blockquote_p]:my-1 [&_hr]:my-3 [&_hr]:border-slate-200">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  ) : msg.text}
                  {msg.sender === 'ai' && (
                    <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                      <Sparkles size={10} /> Trả lời bởi AI
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Ô nhập tin nhắn */}
          <div className="p-4 bg-white border-t border-slate-100">
            <form 
              onSubmit={handleSendMessage}
              className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full pl-4 pr-1 py-1 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Nhập câu hỏi của bạn..."
                className="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-700 py-2"
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className={`p-2 rounded-full flex items-center justify-center transition-colors ${
                  inputValue.trim() 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Send size={16} className="ml-0.5" />
              </button>
            </form>
            <div className="text-center mt-2">
              <span className="text-[10px] text-slate-400 font-medium">Được hỗ trợ bởi EmotionAI</span>
            </div>
          </div>
        </div>
      )}

      {/* NÚT BẬT TẮT CHATBOT (Phóng to) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-20 h-20 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:scale-105 transition-all duration-200 group relative"
        >
           <img 
             src="/bot-icon.png" 
             alt="Chatbot Icon" 
             className="w-14 h-14 object-contain group-hover:animate-pulse" 
           />
           
           <span className="absolute top-1 right-1 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 border-2 border-white"></span>
            </span>
        </button>
      )}
    </div>
  );
};