"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/user-context";

export default function ChatPage() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const { user } = useUser();

  const { messages, sendMessage, status, stop } = useChat({
    api: '/api/chat',
    credentials: 'include',
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Icons.AI size={32} className="text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Welcome to your AI Financial Assistant</h2>
            <p className="text-muted-foreground max-w-md">
              I can help you understand your finances, answer questions about budgeting, spending, and financial planning. Just type your question below to get started!
            </p>
          </div>
        )}

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
              {message.parts.map((part, index) => {
                // Render text parts
                if (part.type === 'text') {
                  return (
                    <p key={index} className="text-sm whitespace-pre-wrap">
                      {part.text}
                    </p>
                  );
                }

                // Render tool invocations - AI SDK v5 uses specific tool names
                // Tool types: tool-getAccounts, tool-getRecentTransactions, tool-searchTransactions, etc.
                if (part.type.startsWith('tool-')) {
                  const toolName = part.type.replace('tool-', '');

                  // Show tool execution state (thinking indicator)
                  if (part.state === 'input-streaming' || part.state === 'input-available') {
                    return (
                      <div key={index} className="text-sm text-muted-foreground italic my-1">
                        <span className="inline-flex items-center gap-2">
                          <span className="animate-pulse">🔄</span>
                          <span>Using {toolName.replace(/([A-Z])/g, ' $1').toLowerCase().trim()}...</span>
                        </span>
                      </div>
                    );
                  }

                  // Don't show tool results - the AI will summarize them in text
                  // Only show errors
                  if (part.state === 'output-error') {
                    return (
                      <div key={index} className="text-sm text-red-500 my-2">
                        ❌ Error: {part.errorText}
                      </div>
                    );
                  }
                }

                return null;
              })}
              <p
                className={cn(
                  "text-xs mt-2",
                  message.role === "user"
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                )}
              >
                {formatTime(message.createdAt || new Date())}
              </p>
            </div>

            {message.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-[#606060] flex items-center justify-center text-white flex-shrink-0">
                <Icons.Face size={18} />
              </div>
            )}
          </div>
        ))}

        {(status === "submitted" || status === "streaming") && (
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) {
              sendMessage({ text: input });
              setInput("");
            }
          }}
          className="flex gap-3 items-end"
        >
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Ask about your finances, budgeting, expenses..."
              className="w-full resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[56px] max-h-[200px]"
              rows={1}
              disabled={status !== "ready"}
            />
          </div>
          <Button
            type="submit"
            disabled={!input || !input.trim() || status !== "ready"}
            className="h-[56px] px-6"
          >
            <Icons.ArrowUpward size={20} />
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}
