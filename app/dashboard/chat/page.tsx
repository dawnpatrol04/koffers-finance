"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from 'ai';
import type { ChatUIMessage } from "@/app/api/chat/route";
import { useEffect, useState } from "react";

// AI Elements Components
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Tool } from "@/components/ai-elements/tool";

// UI Components
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { cn } from "@/lib/utils";

interface UsageStats {
  tokens: {
    used: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  };
  storage: {
    used: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  };
  banks: {
    used: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  };
}

interface Conversation {
  $id: string;
  title: string;
  $createdAt: string;
  $updatedAt: string;
  isPinned?: boolean;
  messageCount?: number;
}

export default function ChatPage() {
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, stop, setMessages } = useChat({
    api: '/api/chat',
    onFinish: ({ message }) => {
      // Refresh usage stats after each message
      fetchUsage();

      // Log token usage from metadata
      if (message.metadata?.totalUsage) {
        console.log('[Chat UI] Message token usage:', message.metadata.totalUsage);
      }
    },
    onError: (error) => {
      setError(error.message);
      fetchUsage(); // Refresh in case we hit limit
    },
  });

  // Load chat history and conversations on mount
  useEffect(() => {
    loadChatHistory();
    loadConversations();
    fetchUsage();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('[Chat UI] Failed to load conversations:', err);
    }
  };

  const loadChatHistory = async () => {
    try {
      const response = await fetch('/api/chat/history');
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('[Chat UI] Failed to load history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchUsage = async () => {
    try {
      const response = await fetch('/api/usage');
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      }
    } catch (err) {
      console.error('[Chat UI] Failed to fetch usage:', err);
    }
  };

  const clearHistory = async () => {
    if (!confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/chat/history', {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessages([]);
      }
    } catch (err) {
      console.error('[Chat UI] Failed to clear history:', err);
    }
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
    // TODO: Load messages for this conversation
    setIsSidebarOpen(false);
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setIsSidebarOpen(false);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setConversations(conversations.filter(c => c.$id !== id));
        if (currentConversationId === id) {
          setCurrentConversationId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('[Chat UI] Failed to delete conversation:', err);
    }
  };

  return (
    <div className="fixed inset-0 md:inset-auto md:absolute md:top-0 md:right-0 md:bottom-0 md:left-[70px] flex flex-col overflow-hidden">
      {/* Chat Sidebar */}
      <ChatSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Fixed Header with Usage Stats */}
      <div className="flex-none border-b border-border bg-background px-4 py-3 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          {/* Title Section with Hamburger Menu */}
          <div className="min-w-0 flex items-start gap-3">
            {/* Hamburger Menu Button */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="flex-shrink-0 mt-0.5"
            >
              <Icons.Menu className="h-5 w-5" />
            </Button>

            <div className="min-w-0">
              <h1 className="text-xl font-semibold md:text-2xl">AI Financial Assistant</h1>
              <p className="text-xs text-muted-foreground mt-0.5 md:text-sm md:mt-1">
                Ask questions about your finances, get insights, and receive personalized advice
              </p>
            </div>
          </div>

          {/* Usage Stats - Compact on mobile */}
          {usage && (
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Token Usage Meter */}
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <Icons.Zap className="h-3 w-3 md:h-4 md:w-4 text-yellow-500" />
                  <span className="text-xs md:text-sm font-medium whitespace-nowrap">
                    {usage.tokens.used.toLocaleString()} / {usage.tokens.limit.toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 w-32 md:w-48 h-1.5 md:h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      usage.tokens.percentUsed > 90 ? 'bg-red-500' :
                      usage.tokens.percentUsed > 75 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, usage.tokens.percentUsed)}%` }}
                  />
                </div>
              </div>

              {/* Clear History Button */}
              {messages.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearHistory}
                  className="text-muted-foreground"
                >
                  <Icons.Delete className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
                  <span className="hidden md:inline">Clear</span>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Warning banner if approaching limit - Compact */}
        {usage && usage.tokens.percentUsed > 75 && (
          <div className={`mt-3 p-2 md:p-3 rounded-lg border flex items-start gap-2 ${
            usage.tokens.percentUsed > 90
              ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
              : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'
          }`}>
            <Icons.AlertCircle className={`h-4 w-4 md:h-5 md:w-5 flex-shrink-0 ${
              usage.tokens.percentUsed > 90 ? 'text-red-600' : 'text-yellow-600'
            }`} />
            <div className="min-w-0">
              <p className={`text-xs md:text-sm font-medium ${
                usage.tokens.percentUsed > 90 ? 'text-red-900 dark:text-red-100' : 'text-yellow-900 dark:text-yellow-100'
              }`}>
                {usage.tokens.percentUsed > 90
                  ? 'Token limit almost reached'
                  : 'Approaching token limit'
                }
              </p>
              <p className={`text-xs mt-0.5 ${
                usage.tokens.percentUsed > 90 ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'
              }`}>
                {usage.tokens.percentUsed.toFixed(1)}% used
                {usage.tokens.percentUsed > 90 && ' - Consider upgrading'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Scrollable Chat Messages Area */}
      <Conversation className="flex-1 min-h-0 overflow-y-auto">
        <ConversationContent className="px-4 py-6 md:px-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Empty State */}
            {messages.length === 0 && !isLoadingHistory && (
              <ConversationEmptyState
                title="Welcome to your AI Financial Assistant"
                description="I can help you understand your finances, answer questions about budgeting, spending, and financial planning. Just type your question below to get started!"
                icon={<Icons.AI size={48} className="text-primary" />}
              />
            )}

            {/* Loading History */}
            {isLoadingHistory && (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <Icons.Loader className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {/* Messages */}
            {messages.map((message) => (
              <Message key={message.id} from={message.role}>
                {/* Message Content */}
                <MessageContent>
                  <MessageResponse>
                    {message.content}
                  </MessageResponse>

                  {/* Token usage for assistant messages */}
                  {message.role === 'assistant' && message.metadata?.totalUsage && (
                    <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/30">
                      {message.metadata.totalUsage.totalTokens.toLocaleString()} tokens used
                    </div>
                  )}
                </MessageContent>

                {/* Message Actions */}
                <MessageActions>
                  <MessageAction
                    tooltip="Copy message"
                    onClick={() => navigator.clipboard.writeText(message.content)}
                  >
                    <Icons.Copy className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </MessageAction>
                  <span className="text-xs text-muted-foreground">
                    {message.createdAt ? new Date(message.createdAt).toLocaleTimeString() : ''}
                  </span>
                </MessageActions>
              </Message>
            ))}

            {/* Error Display */}
            {error && (
              <div className="flex justify-center">
                <div className="max-w-md rounded-lg p-3 md:p-4 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800">
                  <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
                </div>
              </div>
            )}
          </div>
        </ConversationContent>

        {/* Scroll to Bottom Button */}
        <ConversationScrollButton />
      </Conversation>

      {/* Fixed Input Area at Bottom */}
      <div className="flex-none border-t border-border bg-background px-4 py-3 md:px-6">
        <div className="max-w-4xl mx-auto">
          <PromptInput
            onSubmit={(message, e) => {
              e.preventDefault();
              if (!message.text || !message.text.trim() || isLoading || usage?.tokens.remaining === 0) return;
              handleSubmit(e);
            }}
          >
            {/* Text Input */}
            <PromptInputTextarea
              value={input}
              onChange={handleInputChange}
              placeholder={
                usage && usage.tokens.remaining === 0
                  ? "Token limit reached - please upgrade"
                  : "Ask about your finances, budgeting, expenses..."
              }
              disabled={isLoading || (usage?.tokens.remaining === 0)}
            />

            {/* Footer with buttons */}
            <PromptInputFooter>
              {/* Left side - Action Buttons */}
              <PromptInputTools>
                {/* Attach Button */}
                <PromptInputButton
                  disabled
                  title="Attach files (coming soon)"
                >
                  <Icons.AttachFile className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </PromptInputButton>

                {/* Search Button */}
                <PromptInputButton
                  disabled
                  title="Search (coming soon)"
                >
                  <Icons.Search className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </PromptInputButton>

                {/* Model Selector - Fixed to Claude Sonnet 4 */}
                <div className="hidden md:flex items-center gap-2 px-2 text-xs text-muted-foreground">
                  <Icons.AI className="h-4 w-4" />
                  <span>Claude Sonnet 4</span>
                </div>
              </PromptInputTools>

              {/* Right side - Submit Button */}
              <PromptInputSubmit
                status={isLoading ? "streaming" : "awaiting-message"}
                disabled={!input || !input.trim() || (usage?.tokens.remaining === 0)}
              />
            </PromptInputFooter>
          </PromptInput>

          <p className="text-xs text-muted-foreground mt-1.5 text-center">
            Press Enter to send, Shift + Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
