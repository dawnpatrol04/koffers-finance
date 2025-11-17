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

interface ConversationType {
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
  const [conversations, setConversations] = useState<ConversationType[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, stop, setMessages } = useChat({
    api: '/api/chat',
    onFinish: ({ message }) => {
      fetchUsage();
      if (message.metadata?.totalUsage) {
        console.log('[Chat UI] Message token usage:', message.metadata.totalUsage);
      }
    },
    onError: (error) => {
      setError(error.message);
      fetchUsage();
    },
  });

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

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
    // TODO: Load messages for this conversation
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
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
    <div className="flex h-full overflow-hidden -m-4 md:-m-8">
      {/* Main Chat Area - Takes remaining space */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Chat Messages - Scrollable */}
        <Conversation className="flex-1 overflow-y-auto min-h-0">
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

          <ConversationScrollButton />
        </Conversation>

        {/* Fixed Input Area at Bottom */}
        <div className="flex-shrink-0 border-t border-border bg-background px-4 py-3 md:px-6">
          <div className="max-w-4xl mx-auto">
            <PromptInput
              onSubmit={(message, e) => {
                e.preventDefault();
                if (!message.text || !message.text.trim() || isLoading || usage?.tokens.remaining === 0) return;
                handleSubmit(e);
              }}
            >
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

              <PromptInputFooter>
                <PromptInputTools>
                  <PromptInputButton disabled title="Attach files (coming soon)">
                    <Icons.AttachFile className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </PromptInputButton>

                  <PromptInputButton disabled title="Search (coming soon)">
                    <Icons.Search className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </PromptInputButton>

                  <div className="hidden md:flex items-center gap-2 px-2 text-xs text-muted-foreground">
                    <Icons.AI className="h-4 w-4" />
                    <span>Claude Sonnet 4</span>
                  </div>
                </PromptInputTools>

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

      {/* Right Sidebar - Fixed width, always visible */}
      <ChatSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        isOpen={true}
        onToggle={() => {}}
      />
    </div>
  );
}
