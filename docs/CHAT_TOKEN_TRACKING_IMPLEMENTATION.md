# Chat Token Tracking Implementation Plan

## Overview

This document outlines the implementation plan for accurate AI-SDK token counting and chat UI redesign. The goal is to track actual token usage (not message counts) to accurately match Anthropic API costs with user usage.

## Current State Analysis

### Current Implementation Issues

**API Route (`/app/api/chat/route.ts:281`)**
```typescript
return result.toUIMessageStreamResponse();
```
❌ **Problem**: No token tracking or usage recording
❌ **Problem**: No subscription check before allowing chat
❌ **Problem**: No limit enforcement

**Chat UI (`/app/dashboard/chat/page.tsx:15-18`)**
```typescript
const { messages, sendMessage, status, stop } = useChat({
  api: '/api/chat',
  credentials: 'include',
});
```
❌ **Problem**: No usage display
❌ **Problem**: No limit warnings
❌ **Problem**: No subscription state awareness

## AI-SDK Token Tracking Capabilities

### Available in AI-SDK

From the research, AI-SDK provides multiple ways to track token usage:

#### 1. `onFinish` Callback (RECOMMENDED)
```typescript
const result = streamText({
  model: anthropic('claude-sonnet-4-20250514'),
  messages,
  tools: { /* ... */ },
  onFinish: async ({ text, finishReason, usage, totalUsage }) => {
    // usage contains FINAL STEP token usage
    // totalUsage contains TOTAL across ALL STEPS (multi-step tool calling)
    const { promptTokens, completionTokens, totalTokens } = totalUsage;

    // Save to database
    await incrementChatUsage(userId, totalTokens);
  },
});
```

#### 2. Message Metadata (For Client Display)
```typescript
return result.toUIMessageStreamResponse({
  originalMessages: messages,
  messageMetadata: ({ part }) => {
    if (part.type === 'finish') {
      return {
        totalUsage: part.totalUsage,
        model: part.response.modelId,
        createdAt: Date.now(),
      };
    }
  },
});
```

#### 3. Usage Promise (Alternative)
```typescript
// Access usage after streaming completes
const tokenUsage = await result.usage; // Final step only
const totalTokenUsage = await result.totalUsage; // All steps combined
```

### Token Usage Structure

```typescript
interface LanguageModelUsage {
  promptTokens: number;      // Input tokens (renamed from inputTokens in v5)
  completionTokens: number;  // Output tokens (renamed from outputTokens in v5)
  totalTokens: number;       // Total (required in v5)
}
```

**IMPORTANT**: For multi-step tool calling, use `totalUsage` not `usage`:
- `result.usage` = tokens from FINAL step only
- `result.totalUsage` = tokens from ALL steps combined ✅ (Use this!)

## Implementation Plan

### Phase 1: Database Schema (Subscription Usage Tracking)

**Update Appwrite `subscriptions` collection:**

```typescript
interface SubscriptionDocument {
  // Existing fields
  userId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid';
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  currentPeriodEnd: string;
  currentPeriodStart: string;

  // Plan limits
  maxBanks: number;
  maxChatsPerMonth: number; // Actually tokens per month!
  maxStorageGB: number;

  // Usage tracking (ADD THESE)
  currentTokensUsed: number;          // Total tokens this billing period
  currentStorageUsedGB: number;       // Current storage usage
  currentBanksConnected: number;      // Active Plaid connections

  // Usage history for cost analysis (ADD THESE)
  lastTokenResetAt: string;           // ISO date of last monthly reset
  lifetimeTokensUsed: number;         // All-time token usage

  // Add-ons
  addonBanks: number;
  addonChats: number; // Actually addon tokens!
  addonStorage: number;
}
```

**Migration needed**: Rename fields for clarity
- `maxChatsPerMonth` → `maxTokensPerMonth`
- `currentChatsUsed` → `currentTokensUsed`
- `addonChats` → `addonTokens`

### Phase 2: Helper Functions

**Create `/lib/usage-tracking.ts`:**

```typescript
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-config';
import { createAdminClient } from '@/lib/appwrite-server';

/**
 * Increment token usage for a user
 * Called from chat API after each completion
 */
export async function incrementTokenUsage(
  userId: string,
  tokens: number
): Promise<void> {
  const { databases } = await createAdminClient();

  // Get current subscription
  const subscriptions = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    [Query.equal('userId', userId)]
  );

  if (subscriptions.documents.length === 0) {
    throw new Error('No subscription found for user');
  }

  const subscription = subscriptions.documents[0];

  // Update usage counters
  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    subscription.$id,
    {
      currentTokensUsed: (subscription.currentTokensUsed || 0) + tokens,
      lifetimeTokensUsed: (subscription.lifetimeTokensUsed || 0) + tokens,
    }
  );
}

/**
 * Check if user has enough tokens remaining
 * Called BEFORE allowing chat message
 */
export async function checkTokenLimit(userId: string): Promise<{
  allowed: boolean;
  tokensUsed: number;
  tokensLimit: number;
  tokensRemaining: number;
  percentUsed: number;
}> {
  const { databases } = await createAdminClient();

  const subscriptions = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    [Query.equal('userId', userId)]
  );

  if (subscriptions.documents.length === 0) {
    // New user - allow demo usage (30 free tokens = ~30 messages)
    return {
      allowed: true,
      tokensUsed: 0,
      tokensLimit: 30,
      tokensRemaining: 30,
      percentUsed: 0,
    };
  }

  const subscription = subscriptions.documents[0];
  const tokensUsed = subscription.currentTokensUsed || 0;
  const tokensLimit = subscription.maxTokensPerMonth + (subscription.addonTokens || 0);
  const tokensRemaining = Math.max(0, tokensLimit - tokensUsed);
  const percentUsed = (tokensUsed / tokensLimit) * 100;

  return {
    allowed: tokensRemaining > 0,
    tokensUsed,
    tokensLimit,
    tokensRemaining,
    percentUsed,
  };
}

/**
 * Get current usage stats for display
 */
export async function getUsageStats(userId: string) {
  const { databases } = await createAdminClient();

  const subscriptions = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    [Query.equal('userId', userId)]
  );

  if (subscriptions.documents.length === 0) {
    return {
      tokens: { used: 0, limit: 30, remaining: 30, percentUsed: 0 },
      storage: { used: 0, limit: 0, remaining: 0, percentUsed: 0 },
      banks: { used: 0, limit: 0, remaining: 0, percentUsed: 0 },
    };
  }

  const sub = subscriptions.documents[0];

  const tokensLimit = (sub.maxTokensPerMonth || 0) + (sub.addonTokens || 0);
  const storageLimit = (sub.maxStorageGB || 0) + (sub.addonStorage || 0);
  const banksLimit = (sub.maxBanks || 0) + (sub.addonBanks || 0);

  return {
    tokens: {
      used: sub.currentTokensUsed || 0,
      limit: tokensLimit,
      remaining: Math.max(0, tokensLimit - (sub.currentTokensUsed || 0)),
      percentUsed: ((sub.currentTokensUsed || 0) / tokensLimit) * 100,
    },
    storage: {
      used: sub.currentStorageUsedGB || 0,
      limit: storageLimit,
      remaining: Math.max(0, storageLimit - (sub.currentStorageUsedGB || 0)),
      percentUsed: ((sub.currentStorageUsedGB || 0) / storageLimit) * 100,
    },
    banks: {
      used: sub.currentBanksConnected || 0,
      limit: banksLimit,
      remaining: Math.max(0, banksLimit - (sub.currentBanksConnected || 0)),
      percentUsed: ((sub.currentBanksConnected || 0) / banksLimit) * 100,
    },
  };
}

/**
 * Reset monthly usage counters
 * Called by Stripe webhook on billing cycle renewal
 */
export async function resetMonthlyUsage(userId: string): Promise<void> {
  const { databases } = await createAdminClient();

  const subscriptions = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    [Query.equal('userId', userId)]
  );

  if (subscriptions.documents.length === 0) {
    return;
  }

  const subscription = subscriptions.documents[0];

  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    subscription.$id,
    {
      currentTokensUsed: 0,
      lastTokenResetAt: new Date().toISOString(),
    }
  );
}
```

### Phase 3: Update Chat API Route

**Update `/app/api/chat/route.ts`:**

```typescript
import { NextRequest } from 'next/server';
import { anthropic } from '@ai-sdk/anthropic';
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  UIMessage,
  type LanguageModelUsage,
} from 'ai';
import { createSessionClient } from '@/lib/appwrite-server';
import { checkTokenLimit, incrementTokenUsage } from '@/lib/usage-tracking';
import { getAccounts, getRecentTransactions, searchTransactions } from '@/lib/chat-tools';

// Custom metadata type for token usage
type ChatMetadata = {
  totalUsage: LanguageModelUsage;
  model: string;
  createdAt: number;
};

export type ChatUIMessage = UIMessage<ChatMetadata>;

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const { account } = await createSessionClient();
    const user = await account.get();
    const userId = user.$id;

    // 2. Check token limit BEFORE processing
    const tokenCheck = await checkTokenLimit(userId);

    if (!tokenCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Token limit exceeded',
          message: `You've used ${tokenCheck.tokensUsed} of ${tokenCheck.tokensLimit} tokens this month. Please upgrade your plan or wait until your next billing cycle.`,
          tokensUsed: tokenCheck.tokensUsed,
          tokensLimit: tokenCheck.tokensLimit,
        }),
        {
          status: 429, // Too Many Requests
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 3. Parse request
    const { messages }: { messages: ChatUIMessage[] } = await req.json();

    // 4. Stream text with token tracking
    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: `You are a helpful financial assistant for Koffers, a personal finance management app.

You have access to the user's financial data and can help them:
- Understand their spending patterns
- Find specific transactions
- Analyze their financial health
- Answer questions about their accounts and balances

Always be helpful, accurate, and respectful of their financial privacy.`,
      messages: convertToModelMessages(messages),
      stopWhen: stepCountIs(5),
      tools: {
        getAccounts: {
          description: 'Get all bank accounts with current balances',
          inputSchema: z.object({}),
          execute: async () => getAccounts(userId),
        },
        getRecentTransactions: {
          description: 'Get recent transactions (last 30 days)',
          inputSchema: z.object({
            limit: z.number().optional().describe('Number of transactions to return (default 20)'),
          }),
          execute: async ({ limit = 20 }) => getRecentTransactions(userId, limit),
        },
        searchTransactions: {
          description: 'Search transactions by merchant, amount, or date range',
          inputSchema: z.object({
            query: z.string().optional().describe('Search query for merchant name'),
            minAmount: z.number().optional().describe('Minimum transaction amount'),
            maxAmount: z.number().optional().describe('Maximum transaction amount'),
            startDate: z.string().optional().describe('Start date (ISO format)'),
            endDate: z.string().optional().describe('End date (ISO format)'),
          }),
          execute: async (params) => searchTransactions(userId, params),
        },
      },

      // CRITICAL: Track token usage after completion
      onFinish: async ({ text, finishReason, usage, totalUsage }) => {
        // Use totalUsage (all steps) not usage (final step only)
        const tokensUsed = totalUsage.totalTokens;

        console.log('[Chat API] Token usage:', {
          promptTokens: totalUsage.promptTokens,
          completionTokens: totalUsage.completionTokens,
          totalTokens: tokensUsed,
          finishReason,
        });

        // Increment user's token counter
        try {
          await incrementTokenUsage(userId, tokensUsed);
        } catch (error) {
          console.error('[Chat API] Failed to increment token usage:', error);
          // Don't fail the request if usage tracking fails
        }
      },
    });

    // 5. Return stream with metadata
    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      messageMetadata: ({ part }) => {
        // Attach usage metadata to the message
        if (part.type === 'finish') {
          return {
            totalUsage: part.totalUsage,
            model: part.response.modelId,
            createdAt: Date.now(),
          } as ChatMetadata;
        }
      },
    });

  } catch (error: any) {
    console.error('[Chat API] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

### Phase 4: Create Usage API Endpoint

**Create `/app/api/usage/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/appwrite-server';
import { getUsageStats } from '@/lib/usage-tracking';

export async function GET(req: NextRequest) {
  try {
    const { account } = await createSessionClient();
    const user = await account.get();

    const usage = await getUsageStats(user.$id);

    return NextResponse.json(usage);
  } catch (error: any) {
    console.error('[Usage API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Phase 5: Redesigned Chat UI

**Update `/app/dashboard/chat/page.tsx`:**

```typescript
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect, useRef } from 'react';
import { Send, StopCircle, AlertCircle, Zap } from 'lucide-react';
import type { ChatUIMessage } from '@/app/api/chat/route';

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

export default function ChatPage() {
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, stop } = useChat<ChatUIMessage>({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    onFinish: ({ message }) => {
      // Refresh usage stats after each message
      fetchUsage();

      // Log token usage from metadata
      if (message.metadata?.totalUsage) {
        console.log('Message token usage:', message.metadata.totalUsage);
      }
    },
    onError: (error) => {
      setError(error.message);
      fetchUsage(); // Refresh in case we hit limit
    },
  });

  // Fetch usage on mount and when messages change
  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const response = await fetch('/api/usage');
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      }
    } catch (err) {
      console.error('Failed to fetch usage:', err);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    handleSubmit(e);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with usage stats */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">AI Assistant</h1>
            <p className="text-sm text-muted-foreground">Ask questions about your finances</p>
          </div>

          {usage && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">
                    {usage.tokens.used.toLocaleString()} / {usage.tokens.limit.toLocaleString()} tokens
                  </span>
                </div>
                <div className="mt-1 w-48 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      usage.tokens.percentUsed > 90 ? 'bg-red-500' :
                      usage.tokens.percentUsed > 75 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, usage.tokens.percentUsed)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {usage.tokens.remaining.toLocaleString()} tokens remaining
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Warning banner if approaching limit */}
        {usage && usage.tokens.percentUsed > 75 && (
          <div className={`mt-4 p-3 rounded-lg border flex items-start gap-2 ${
            usage.tokens.percentUsed > 90
              ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
              : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'
          }`}>
            <AlertCircle className={`h-5 w-5 mt-0.5 ${
              usage.tokens.percentUsed > 90 ? 'text-red-600' : 'text-yellow-600'
            }`} />
            <div>
              <p className={`text-sm font-medium ${
                usage.tokens.percentUsed > 90 ? 'text-red-900 dark:text-red-100' : 'text-yellow-900 dark:text-yellow-100'
              }`}>
                {usage.tokens.percentUsed > 90
                  ? 'Token limit almost reached'
                  : 'Approaching token limit'
                }
              </p>
              <p className={`text-xs mt-1 ${
                usage.tokens.percentUsed > 90 ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'
              }`}>
                You've used {usage.tokens.percentUsed.toFixed(1)}% of your monthly token allocation.
                {usage.tokens.percentUsed > 90 && ' Consider upgrading your plan.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground mt-8">
            <p className="text-lg">Ask me anything about your finances!</p>
            <p className="text-sm mt-2">Try: "What's my total balance?" or "Show me recent transactions"</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <div className="whitespace-pre-wrap">
                {message.parts.map((part, index) => {
                  if (part.type === 'text') {
                    return <span key={index}>{part.text}</span>;
                  }
                  return null;
                })}
              </div>

              {/* Show token usage for AI messages */}
              {message.role === 'assistant' && message.metadata?.totalUsage && (
                <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                  {message.metadata.totalUsage.totalTokens.toLocaleString()} tokens used
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-4 bg-muted">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="max-w-md rounded-lg p-4 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800">
              <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <form onSubmit={handleFormSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder={
              usage && usage.tokens.remaining === 0
                ? "Token limit reached - please upgrade"
                : "Type a message..."
            }
            disabled={isLoading || (usage?.tokens.remaining === 0)}
            className="flex-1 px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          />

          {isLoading ? (
            <button
              type="button"
              onClick={stop}
              className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors flex items-center gap-2"
            >
              <StopCircle className="h-4 w-4" />
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || (usage?.tokens.remaining === 0)}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
```

### Phase 6: Stripe Webhook Integration

**Update `/app/api/webhooks/stripe/route.ts` to reset monthly usage:**

```typescript
// Add to the webhook handler
case 'invoice.payment_succeeded': {
  const invoice = event.data.object;
  const customerId = invoice.customer;
  const subscriptionId = invoice.subscription;

  // Reset monthly usage counters on successful payment
  const subs = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    [Query.equal('stripeCustomerId', customerId)]
  );

  if (subs.documents.length > 0) {
    const subscription = subs.documents[0];
    await resetMonthlyUsage(subscription.userId);
  }
  break;
}
```

## Cost Calculation

### Anthropic Claude Pricing (as of Nov 2024)

**Claude Sonnet 4:**
- Input: $3.00 per million tokens
- Output: $15.00 per million tokens

**Example usage costs:**

| Tokens Used | Input (60%) | Output (40%) | Total Cost |
|-------------|-------------|--------------|------------|
| 10,000      | $0.018      | $0.060       | $0.078     |
| 100,000     | $0.180      | $0.600       | $0.780     |
| 1,000,000   | $1.800      | $6.000       | $7.800     |

**Estimated token usage per message:**
- Simple query: 200-500 tokens
- Tool call (1 step): 500-1,500 tokens
- Complex multi-step: 2,000-5,000 tokens

**Pricing tiers for users:**

| Plan | Monthly Token Limit | Estimated Messages | Est. Cost to Us | Price to User | Margin |
|------|---------------------|-------------------|----------------|---------------|--------|
| Demo | 30 | ~30 | $0.00 (loss leader) | $0 | -$0.00 |
| Starter | 50,000 | ~150 | $0.39 | $9.99 | $9.60 |
| Pro | 200,000 | ~500 | $1.56 | $29.99 | $28.43 |
| Business | 1,000,000 | ~2,500 | $7.80 | $99.99 | $92.19 |

## Testing Plan

### 1. Token Tracking Accuracy
- Send 10 test messages with known token counts
- Verify `currentTokensUsed` matches actual usage
- Compare with Anthropic API dashboard

### 2. Limit Enforcement
- Set test account to low limit (e.g., 100 tokens)
- Verify chat blocks when limit reached
- Verify error message displays correctly

### 3. Monthly Reset
- Trigger test webhook for `invoice.payment_succeeded`
- Verify `currentTokensUsed` resets to 0
- Verify `lastTokenResetAt` updates

### 4. UI/UX
- Verify usage bar updates in real-time
- Verify warning banners show at 75% and 90%
- Verify input disables at 100%
- Verify token count shows on messages

## Implementation Checklist

- [ ] Create `usage-tracking.ts` helper functions
- [ ] Update Appwrite subscriptions collection schema
- [ ] Update chat API route with token tracking
- [ ] Create usage API endpoint
- [ ] Redesign chat UI with usage display
- [ ] Update Stripe webhook for monthly reset
- [ ] Add subscription check to chat page
- [ ] Test token counting accuracy
- [ ] Test limit enforcement
- [ ] Test monthly reset
- [ ] Deploy to production
- [ ] Monitor costs vs revenue

## Next Steps After Implementation

1. **Cost Monitoring Dashboard**: Admin page showing real-time cost vs revenue
2. **Usage Analytics**: Track average tokens per user, per feature
3. **Smart Limits**: Adjust limits based on actual usage patterns
4. **Overage Handling**: Allow users to purchase token packs
5. **Cost Optimization**: Cache common queries, optimize prompts to reduce tokens
