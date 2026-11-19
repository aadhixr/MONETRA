// AURIX - High-Fidelity AI Financial Assistant Chat Interface
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, ShieldCheck, RefreshCw } from 'lucide-react';
import { Card } from '../common/Card';
import { useFinancial } from '../../context/FinancialContext';
import { AIInsightsService } from '../../services/aiInsightsService';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export const AIAssistantChat: React.FC = () => {
  const {
    currentMonth,
    accounts,
    transactions,
    categories,
    monthlyBudget,
  } = useFinancial();

  const [inputQuery, setInputQuery] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg_welcome',
      sender: 'ai',
      text: `Hello! I am your **AURIX AI Financial Assistant**.\n\nI analyze your local financial ledger with 100% precision. Ask me about your debited expenses, salary credits, remaining balance, or if you can afford a purchase!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const QUICK_QUESTIONS = [
    'What was debited?',
    'Show my salary',
    'How much did I spend this month?',
    'Available balance',
    'How much on Food?',
    'Can I afford ₹5,000?',
    'How much can I safely spend today?',
  ];

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (queryText: string) => {
    if (!queryText.trim()) return;

    const userMsg: Message = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text: queryText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Deterministically query local AI service
    const response = AIInsightsService.answerFinancialQuery(
      queryText,
      currentMonth,
      accounts,
      transactions,
      categories,
      monthlyBudget
    );

    const aiMsg: Message = {
      id: `msg_ai_${Date.now() + 1}`,
      sender: 'ai',
      text: response.answer,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInputQuery('');
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `msg_welcome_${Date.now()}`,
        sender: 'ai',
        text: `Conversation refreshed! What financial question can I help you with?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Helper to render bold markdown in messages
  const renderFormattedText = (raw: string) => {
    const parts = raw.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="text-[#E7FF32] font-extrabold tracking-wide">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <Card className="p-4 bg-[#1C2019] border-[#30352B] rounded-[24px] shadow-xl flex flex-col h-[520px]">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#30352B]/60 shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#E7FF32]/15 text-[#E7FF32] flex items-center justify-center shadow-[0_0_10px_rgba(231,255,50,0.2)]">
            <Sparkles className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              AURIX AI Assistant
            </h3>
            <span className="text-[10px] text-[#A8E66A] flex items-center">
              <ShieldCheck className="w-3 h-3 mr-1 inline" /> 100% Private On-Device AI
            </span>
          </div>
        </div>

        <button
          onClick={handleResetChat}
          className="p-1.5 rounded-lg text-[#A1A69A] hover:text-white hover:bg-[#151812] transition-colors"
          title="Reset conversation"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Chat Messages Scrollable Box */}
      <div className="flex-1 overflow-y-auto my-3 space-y-3 pr-1 scrollbar-thin">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start space-x-2 ${
              m.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {m.sender === 'ai' && (
              <div className="w-6 h-6 rounded-full bg-[#E7FF32]/20 text-[#E7FF32] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed transition-all ${
                m.sender === 'user'
                  ? 'bg-[#E7FF32] text-[#090B08] font-semibold rounded-tr-none shadow-md'
                  : 'bg-[#151812] border border-[#30352B] text-gray-200 rounded-tl-none whitespace-pre-line shadow-sm'
              }`}
            >
              {renderFormattedText(m.text)}
              <span
                className={`block text-[9px] mt-1.5 ${
                  m.sender === 'user' ? 'text-[#090B08]/60 text-right' : 'text-[#A1A69A]'
                }`}
              >
                {m.timestamp}
              </span>
            </div>
          </div>
        ))}
        <div ref={chatBottomRef} />
      </div>

      {/* Quick Suggestion Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none shrink-0">
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => handleSend(q)}
            className="px-2.5 py-1 rounded-full bg-[#151812] border border-[#30352B] text-[11px] text-[#A1A69A] hover:text-[#E7FF32] hover:border-[#E7FF32]/50 whitespace-nowrap transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(inputQuery);
        }}
        className="flex items-center gap-2 pt-2 border-t border-[#30352B]/60 shrink-0"
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Ask: What was debited? Show salary? Can I afford ₹5,000?"
          className="flex-1 bg-[#151812] border border-[#30352B] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#E7FF32] transition-colors"
        />
        <button
          type="submit"
          className="p-2.5 rounded-xl bg-[#E7FF32] text-[#090B08] hover:bg-[#C9E927] transition-all active:scale-95 shadow-[0_0_10px_rgba(231,255,50,0.3)]"
          title="Send"
        >
          <Send className="w-4 h-4 stroke-[2.5]" />
        </button>
      </form>
    </Card>
  );
};

