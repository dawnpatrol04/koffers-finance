"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const mockMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "Hello! I'm your AI financial assistant. I can help you with budgeting, expense tracking, financial insights, and answer questions about your transactions. How can I assist you today?",
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
  },
  {
    id: "2",
    role: "user",
    content: "What were my biggest expenses this month?",
    timestamp: new Date(Date.now() - 1000 * 60 * 25),
  },
  {
    id: "3",
    role: "assistant",
    content:
      "Based on your transaction history, your biggest expenses this month were:\n\n1. Rent: $1,200.00\n2. Groceries: $487.23\n3. Utilities: $245.67\n\nThese three categories represent about 75% of your total monthly spending.",
    timestamp: new Date(Date.now() - 1000 * 60 * 25),
  },
  {
    id: "4",
    role: "user",
    content: "Can you help me create a budget for next month?",
    timestamp: new Date(Date.now() - 1000 * 60 * 20),
  },
  {
    id: "5",
    role: "assistant",
    content:
      "I'd be happy to help you create a budget! Based on your income and spending patterns, here's a suggested budget:\n\n**Income:** $4,500/month\n\n**Fixed Expenses (50%):**\n- Rent: $1,200\n- Utilities: $250\n- Insurance: $150\n- Subscriptions: $50\n\n**Variable Expenses (30%):**\n- Groceries: $500\n- Dining out: $200\n- Transportation: $150\n- Entertainment: $200\n\n**Savings & Investments (20%):**\n- Emergency fund: $450\n- Retirement: $450\n\nWould you like me to adjust any of these categories?",
    timestamp: new Date(Date.now() - 1000 * 60 * 20),
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "I understand your question. In a production environment, I would analyze your financial data and provide personalized insights. This is a mock response to demonstrate the chat interface.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Chat Header */}
      <div className="border-b border-border bg-background px-6 py-4">
        <h1 className="text-2xl font-semibold">AI Financial Assistant</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ask questions about your finances, get insights, and receive personalized
          advice
        </p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white flex-shrink-0">
                <Icons.AI size={18} />
              </div>
            )}

            <div
              className={cn(
                "max-w-[70%] rounded-lg px-4 py-3",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-[#F2F1EF] dark:bg-secondary border border-border"
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p
                className={cn(
                  "text-xs mt-2",
                  message.role === "user"
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                )}
              >
                {formatTime(message.timestamp)}
              </p>
            </div>

            {message.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-[#606060] flex items-center justify-center text-white flex-shrink-0">
                <Icons.Face size={18} />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white flex-shrink-0">
              <Icons.AI size={18} />
            </div>
            <div className="bg-[#F2F1EF] dark:bg-secondary border border-border rounded-lg px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-[#606060] animate-bounce" />
                <div
                  className="w-2 h-2 rounded-full bg-[#606060] animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
                <div
                  className="w-2 h-2 rounded-full bg-[#606060] animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-background px-6 py-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about your finances, budgeting, expenses..."
              className="w-full resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[56px] max-h-[200px]"
              rows={1}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="h-[56px] px-6"
          >
            <Icons.ArrowUpward size={20} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}
