import { anthropic } from '@ai-sdk/anthropic';
import { streamText, convertToModelMessages, type UIMessage, tool } from 'ai';
import { z } from 'zod';
import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';
import { cookies } from 'next/headers';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Helper to get current user ID from session
async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session');

    if (!session) {
      return null;
    }

    const sessionData = JSON.parse(session.value);
    return sessionData.userId || null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

export async function POST(req: Request) {
  const { messages, userId: clientUserId }: { messages: UIMessage[]; userId?: string } = await req.json();

  // Try to get user ID from session, fallback to client-provided userId
  let userId = await getCurrentUserId();

  if (!userId && clientUserId) {
    userId = clientUserId;
  }

  if (!userId) {
    return Response.json({ error: 'Unauthorized - No user ID provided' }, { status: 401 });
  }

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
          const accountsResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.PLAID_ACCOUNTS,
            [Query.equal('userId', userId)]
          );

          return {
            accounts: accountsResponse.documents.map((doc: any) => ({
              id: doc.$id,
              name: doc.name,
              officialName: doc.officialName,
              type: doc.type,
              subtype: doc.subtype,
              currentBalance: doc.balances?.current || 0,
              availableBalance: doc.balances?.available || 0,
              currency: doc.balances?.isoCurrencyCode || 'USD',
              mask: doc.mask,
            })),
            totalBalance: accountsResponse.documents.reduce(
              (sum: number, doc: any) => sum + (doc.balances?.current || 0),
              0
            ),
          };
        },
      }),
      getRecentTransactions: tool({
        description: 'Get recent transactions. Default returns 20, max 100.',
        inputSchema: z.object({
          limit: z.number().min(1).max(100).default(20).optional(),
        }),
        execute: async ({ limit = 20 }) => {
          const transactionsResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.PLAID_TRANSACTIONS,
            [
              Query.equal('userId', userId),
              Query.orderDesc('date'),
              Query.limit(limit),
            ]
          );

          return {
            transactions: transactionsResponse.documents.map((doc: any) => ({
              id: doc.$id,
              date: doc.date,
              name: doc.name,
              merchantName: doc.merchantName,
              amount: doc.amount,
              currency: doc.isoCurrencyCode || 'USD',
              category: typeof doc.category === 'string' ? JSON.parse(doc.category) : doc.category,
              accountName: doc.accountName,
              pending: doc.pending || false,
            })),
            count: transactionsResponse.documents.length,
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
          const queries = [
            Query.equal('userId', userId),
            Query.orderDesc('date'),
            Query.limit(limit),
          ];

          // Note: Appwrite's search is limited, so we'll fetch and filter
          const transactionsResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.PLAID_TRANSACTIONS,
            queries
          );

          let results = transactionsResponse.documents;

          // Filter by merchant name (case-insensitive)
          if (merchantName) {
            const searchLower = merchantName.toLowerCase();
            results = results.filter((doc: any) =>
              (doc.merchantName?.toLowerCase() || '').includes(searchLower) ||
              (doc.name?.toLowerCase() || '').includes(searchLower)
            );
          }

          // Filter by amount range
          if (minAmount !== undefined) {
            results = results.filter((doc: any) => doc.amount >= minAmount);
          }
          if (maxAmount !== undefined) {
            results = results.filter((doc: any) => doc.amount <= maxAmount);
          }

          return {
            transactions: results.map((doc: any) => ({
              id: doc.$id,
              date: doc.date,
              name: doc.name,
              merchantName: doc.merchantName,
              amount: doc.amount,
              currency: doc.isoCurrencyCode || 'USD',
              category: typeof doc.category === 'string' ? JSON.parse(doc.category) : doc.category,
              accountName: doc.accountName,
              pending: doc.pending || false,
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
          const account = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.PLAID_ACCOUNTS,
            accountId
          );

          return {
            name: account.name,
            officialName: account.officialName,
            type: account.type,
            subtype: account.subtype,
            currentBalance: account.balances?.current || 0,
            availableBalance: account.balances?.available || 0,
            currency: account.balances?.isoCurrencyCode || 'USD',
            mask: account.mask,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
