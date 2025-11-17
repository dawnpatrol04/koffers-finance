"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface Conversation {
  $id: string;
  title: string;
  $createdAt: string;
  $updatedAt: string;
  isPinned?: boolean;
  messageCount?: number;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  currentConversationId?: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function ChatSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isOpen,
  onToggle,
}: ChatSidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Group conversations by time period
  const groupConversations = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const groups = {
      pinned: [] as Conversation[],
      today: [] as Conversation[],
      yesterday: [] as Conversation[],
      lastWeek: [] as Conversation[],
      lastMonth: [] as Conversation[],
      older: [] as Conversation[],
    };

    conversations.forEach((conv) => {
      const updatedAt = new Date(conv.$updatedAt);

      if (conv.isPinned) {
        groups.pinned.push(conv);
      } else if (updatedAt >= today) {
        groups.today.push(conv);
      } else if (updatedAt >= yesterday) {
        groups.yesterday.push(conv);
      } else if (updatedAt >= lastWeek) {
        groups.lastWeek.push(conv);
      } else if (updatedAt >= lastMonth) {
        groups.lastMonth.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  };

  const groups = groupConversations();

  const renderConversation = (conv: Conversation) => {
    const isActive = conv.$id === currentConversationId;
    const isHovered = conv.$id === hoveredId;

    return (
      <div
        key={conv.$id}
        className={cn(
          "group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors",
          isActive
            ? "bg-secondary text-secondary-foreground"
            : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
        )}
        onMouseEnter={() => setHoveredId(conv.$id)}
        onMouseLeave={() => setHoveredId(null)}
        onClick={() => onSelectConversation(conv.$id)}
      >
        <Icons.Message className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 truncate">{conv.title}</span>
        {(isActive || isHovered) && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteConversation(conv.$id);
            }}
          >
            <Icons.Delete className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  };

  const renderGroup = (title: string, conversations: Conversation[]) => {
    if (conversations.length === 0) return null;

    return (
      <div className="mb-4">
        <h3 className="px-3 mb-2 text-xs font-medium text-muted-foreground">
          {title}
        </h3>
        <div className="space-y-1">
          {conversations.map(renderConversation)}
        </div>
      </div>
    );
  };

  return (
    <div
      className="flex flex-col bg-background border-l border-border h-full w-80"
    >
        {/* Header */}
        <div className="flex-none p-4 border-b border-border">
          <h2 className="font-semibold text-lg">Conversations</h2>
        </div>

        {/* New Chat Button */}
        <div className="flex-none p-3">
          <Button
            onClick={onNewConversation}
            className="w-full justify-start gap-2"
            variant="outline"
          >
            <Icons.Add className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        {/* Conversations List - Scrollable */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <Icons.Message className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">
                No conversations yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Start a new chat to begin
              </p>
            </div>
          ) : (
            <>
              {renderGroup("Pinned", groups.pinned)}
              {renderGroup("Today", groups.today)}
              {renderGroup("Yesterday", groups.yesterday)}
              {renderGroup("Previous 7 Days", groups.lastWeek)}
              {renderGroup("Previous 30 Days", groups.lastMonth)}
              {renderGroup("Older", groups.older)}
            </>
          )}
        </div>
    </div>
  );
}
