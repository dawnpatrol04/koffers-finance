import { anthropic } from '@ai-sdk/anthropic';
import { streamText, convertToModelMessages, type UIMessage, tool } from 'ai';
import { z } from 'zod';
import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';
import { validateSession } from '@/lib/auth-helpers';
import * as accountsData from '@/lib/data/accounts';
import * as transactionsData from '@/lib/data/transactions';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // Validate session and get userId securely
    const { userId } = await validateSession();

    const { messages }: { messages: UIMessage[] } = await req.json();

    const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: `You are a helpful financial assistant for Koffers, a personal finance management app.
You help users understand their finances, answer questions about budgeting, spending, and financial planning.
Keep responses friendly, clear, and actionable.

You have access to tools to query the user's financial data:
- getAccounts: Get all connected bank accounts with balances
- getRecentTransactions: Get recent transactions (default 20, max 100)
- searchTransactions: Search transactions by merchant name or amount
- getAccountBalance: Get balance for a specific account

Always use these tools when the user asks about their accounts, balances, transactions, or spending.`,
    messages: convertToModelMessages(messages),
    tools: {
      getAccounts: tool({
        description: 'Get all connected bank accounts with current balances',
        inputSchema: z.object({}),
        execute: async () => {
          // Use shared business logic
          const summary = await accountsData.getAccountsSummary(userId);

          return {
            accounts: summary.accounts.map(acc => ({
              id: acc.id,
              name: acc.name,
              type: acc.type,
              subtype: acc.subtype,
              currentBalance: acc.currentBalance,
              availableBalance: acc.availableBalance,
              currency: acc.currency,
              mask: acc.mask,
              institutionName: acc.institutionName,
            })),
            totalBalance: summary.totalBalance,
          };
        },
      }),
      getRecentTransactions: tool({
        description: 'Get recent transactions. Default returns 20, max 100.',
        inputSchema: z.object({
          limit: z.number().min(1).max(100).default(20).optional(),
        }),
        execute: async ({ limit = 20 }) => {
          // Use shared business logic
          const transactions = await transactionsData.getTransactions(userId, { limit });

          return {
            transactions: transactions.map(txn => ({
              id: txn.id,
              date: txn.date,
              name: txn.name,
              merchantName: txn.merchantName,
              amount: txn.amount,
              currency: txn.currency,
              category: txn.category,
              pending: txn.pending,
            })),
            count: transactions.length,
          };
        },
      }),
      searchTransactions: tool({
        description: 'Search transactions by merchant name, description, or filter by amount range',
        inputSchema: z.object({
          merchantName: z.string().optional().describe('Search by merchant name (partial match)'),
          minAmount: z.number().optional().describe('Minimum amount filter'),
          maxAmount: z.number().optional().describe('Maximum amount filter'),
          limit: z.number().min(1).max(100).default(20).optional(),
        }),
        execute: async ({ merchantName, minAmount, maxAmount, limit = 20 }) => {
          // Use shared business logic with appropriate filters
          // Note: This Chat tool has a different interface than MCP search_transactions
          const transactions = await transactionsData.getTransactions(userId, { limit: 500 });

          let results = transactions;

          // Filter by merchant name (case-insensitive)
          if (merchantName) {
            const searchLower = merchantName.toLowerCase();
            results = results.filter(txn =>
              (txn.merchantName?.toLowerCase() || '').includes(searchLower) ||
              (txn.name?.toLowerCase() || '').includes(searchLower)
            );
          }

          // Filter by amount range
          if (minAmount !== undefined) {
            results = results.filter(txn => txn.amount >= minAmount);
          }
          if (maxAmount !== undefined) {
            results = results.filter(txn => txn.amount <= maxAmount);
          }

          // Limit results
          results = results.slice(0, limit);

          return {
            transactions: results.map(txn => ({
              id: txn.id,
              date: txn.date,
              name: txn.name,
              merchantName: txn.merchantName,
              amount: txn.amount,
              currency: txn.currency,
              category: txn.category,
              pending: txn.pending,
            })),
            count: results.length,
          };
        },
      }),
      getAccountBalance: tool({
        description: 'Get current balance for a specific account by account ID',
        inputSchema: z.object({
          accountId: z.string().describe('The account ID to get balance for'),
        }),
        execute: async ({ accountId }) => {
          // Use shared business logic
          const account = await accountsData.getAccountById(userId, accountId);

          return {
            name: account.name,
            type: account.type,
            subtype: account.subtype,
            currentBalance: account.currentBalance,
            availableBalance: account.availableBalance,
            currency: account.currency,
            mask: account.mask,
            institutionName: account.institutionName,
          };
        },
      }),
    },
  });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    // Handle authentication errors
    if (error.message?.includes('Unauthorized')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Error in chat:', error);
    return Response.json(
      { error: error.message || 'Chat request failed' },
      { status: 500 }
    );
  }
}
