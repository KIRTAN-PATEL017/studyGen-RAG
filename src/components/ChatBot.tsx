import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2 } from 'lucide-react';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
}

const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! I'm your AI assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
      status: 'read'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const newUserMessage: Message = {
      id: messages.length + 1,
      text: inputText,
      isUser: true,
      timestamp: new Date(),
      status: 'sent'
    };

    setMessages(prev => [...prev, newUserMessage]);
    const currentInput = inputText;
    setInputText('');
    setIsTyping(true);

    try {
      const res = await fetch("http://localhost:5000/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: currentInput })
      });

      const data = await res.json();
      const botResponse: Message = {
        id: messages.length + 2,
        text: data.response.result || "Sorry, I couldn't understand that.",
        isUser: false,
        timestamp: new Date(),
        status: 'delivered'
      };

      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      const errorResponse: Message = {
        id: messages.length + 2,
        text: "Error connecting to server.",
        isUser: false,
        timestamp: new Date(),
        status: 'delivered'
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        text: "Chat cleared! How can I help you today?",
        isUser: false,
        timestamp: new Date(),
        status: 'read'
      }
    ]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-screen max-h-[800px] bg-gray-900 rounded-lg shadow-2xl border border-gray-700">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">AI Assistant</h2>
            <p className="text-white/80 text-sm">Always here to help</p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-200"
          title="Clear chat"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-800">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md xl:max-w-lg ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.isUser 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-600 text-gray-200'
              }`}>
                {message.isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              
              {/* Message Bubble */}
              <div className={`rounded-2xl px-4 py-2 shadow-sm ${
                message.isUser
                  ? 'bg-blue-600 text-white rounded-br-md shadow-lg'
                  : 'bg-gray-700 text-gray-100 rounded-bl-md border border-gray-600'
              }`}>
                <p className="text-sm leading-relaxed">{message.text}</p>
                <div className={`flex items-center justify-between mt-1 space-x-2 ${
                  message.isUser ? 'text-blue-100' : 'text-gray-400'
                }`}>
                  <span className="text-xs">{formatTime(message.timestamp)}</span>
                  {message.isUser && message.status && (
                    <span className="text-xs opacity-75">
                      {message.status === 'sent' && '✓'}
                      {message.status === 'delivered' && '✓✓'}
                      {message.status === 'read' && '✓✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start animate-fade-in">
            <div className="flex items-end space-x-2 max-w-xs lg:max-w-md xl:max-w-lg">
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-gray-200" />
              </div>
              <div className="bg-gray-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-600">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700 p-4 bg-gray-900 rounded-b-lg">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="w-full px-4 py-3 border border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-gray-800 text-gray-100 placeholder-gray-400 transition-all duration-200"
              disabled={isTyping}
            />
            {inputText && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                {inputText.length}/1000
              </div>
            )}
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isTyping}
            className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default ChatBot;
