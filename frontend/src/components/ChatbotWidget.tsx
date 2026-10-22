import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}

export const ChatbotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: 'Xin chào! Mình là trợ lý AI của EmotionAI. Mình có thể giúp gì cho bạn?', sender: 'ai' }
  ]);
  const [inputValue, setInputValue] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newUserMsg: Message = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputValue('');

    setTimeout(() => {
      const aiResponse: Message = {
        id: Date.now() + 1,
        text: 'Chức năng giải đáp thông minh đang được team phát triển thêm. Hiện tại bạn có thể trải nghiệm tính năng nhận diện cảm xúc qua Webcam nhé!',
        sender: 'ai',
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
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
                
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-sm' 
                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
                }`}>
                  {msg.text}
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