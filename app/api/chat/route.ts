import { anthropic } from '@ai-sdk/anthropic';
import { streamText, convertToModelMessages, type UIMessage, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-config';
import { createSessionClient } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';
import * as accountsData from '@/lib/data/accounts';
import * as transactionsData from '@/lib/data/transactions';
import * as filesData from '@/lib/data/files';
import * as receiptsData from '@/lib/data/receipts';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // Validate session and get userId securely
    console.log('[Chat API] Validating session...');
    const { account } = await createSessionClient();
    const user = await account.get();
    const userId = user.$id;
    console.log('[Chat API] Session validated for user:', userId);

    const { messages }: { messages: UIMessage[] } = await req.json();

    const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: `You are a helpful financial assistant for Koffers, a personal finance management app.
You help users understand their finances, answer questions about budgeting, spending, and financial planning.
You can also help process receipts, extract line items, and match receipts to transactions.
Keep responses friendly, clear, and actionable.

You have access to tools to query and manage the user's financial data:

**Account & Transaction Tools:**
- getAccounts: Get all connected bank accounts with balances
- getRecentTransactions: Get recent transactions (default 20, max 100)
- searchTransactions: Search transactions by merchant name or amount range
- getAccountBalance: Get balance for a specific account
- get_spending_summary: Get spending breakdown by category for a time period

**Receipt & File Tools:**
- list_unprocessed_files: List receipts/files that haven't been matched to transactions yet
- view_file: View a receipt or file (you can analyze images and PDFs)
- link_file_to_transaction: Link a receipt to a transaction after identifying the match
- save_receipt_items: Save line items extracted from a receipt

Always use these tools when the user asks about accounts, transactions, spending, receipts, or files.

IMPORTANT: After using a tool, always provide a natural language summary of the results for the user.`,
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5), // Allow multi-step tool calling so the model can respond after tool execution
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
      get_spending_summary: tool({
        description: 'Get spending summary grouped by category for a time period. Shows total spending and breakdown by category with percentages.',
        inputSchema: z.object({
          startDate: z.string().optional().describe('Start date (ISO format YYYY-MM-DD, defaults to 30 days ago)'),
          endDate: z.string().optional().describe('End date (ISO format YYYY-MM-DD, defaults to today)'),
        }),
        execute: async ({ startDate, endDate }) => {
          // Use shared business logic
          const summary = await transactionsData.getSpendingSummary(userId, startDate, endDate);

          return {
            period: summary.period,
            totalSpending: summary.totalSpending,
            categories: summary.categories,
          };
        },
      }),
      list_unprocessed_files: tool({
        description: 'List files/receipts that have not been processed yet (pending OCR). Useful for finding receipts that need to be matched to transactions.',
        inputSchema: z.object({
          limit: z.number().min(1).max(100).default(50).optional().describe('Maximum number of files to return'),
        }),
        execute: async ({ limit = 50 }) => {
          // Use shared business logic
          const files = await filesData.listUnprocessedFiles(userId, limit);

          return {
            files: files.map(f => ({
              id: f.id,
              fileId: f.fileId,
              fileName: f.fileName,
              mimeType: f.mimeType,
              fileSize: f.fileSize,
              createdAt: f.createdAt,
              ocrStatus: f.ocrStatus,
            })),
            total: files.length,
          };
        },
      }),
      view_file: tool({
        description: 'View a file/receipt by its file ID. Returns the file content as base64 data so you can analyze it (images, PDFs, etc).',
        inputSchema: z.object({
          fileId: z.string().describe('The file ID (from list_unprocessed_files or other file listings)'),
        }),
        execute: async ({ fileId }) => {
          // Use shared business logic
          const fileData = await filesData.viewFile(userId, fileId);

          return {
            id: fileData.id,
            fileId: fileData.fileId,
            fileName: fileData.fileName,
            mimeType: fileData.mimeType,
            fileSizeKB: fileData.fileSizeKB,
            base64Data: fileData.base64Data,
            transactionId: fileData.transactionId,
          };
        },
      }),
      link_file_to_transaction: tool({
        description: 'Link a file/receipt to a transaction. Use this after viewing a receipt and identifying which transaction it belongs to.',
        inputSchema: z.object({
          fileId: z.string().describe('The file ID to link'),
          transactionId: z.string().describe('The transaction ID to link the file to'),
          fileType: z.enum(['receipt', 'return', 'warranty', 'invoice', 'note', 'other']).default('receipt').optional().describe('Type of file'),
        }),
        execute: async ({ fileId, transactionId, fileType = 'receipt' }) => {
          // Use shared business logic
          const result = await filesData.linkFileToTransaction(userId, fileId, transactionId, fileType);

          return {
            success: result.success,
            fileId: result.fileId,
            transactionId: result.transactionId,
            fileType: result.fileType,
            message: 'Receipt linked to transaction successfully',
          };
        },
      }),
      save_receipt_items: tool({
        description: 'Save line items extracted from a receipt. Use this after viewing a receipt and extracting the individual items purchased.',
        inputSchema: z.object({
          transactionId: z.string().describe('The transaction ID these items belong to'),
          items: z.array(z.object({
            name: z.string().describe('Item name/description'),
            quantity: z.number().describe('Quantity purchased'),
            price: z.number().describe('Unit price'),
            totalPrice: z.number().optional().describe('Total price (quantity * price)'),
            category: z.string().optional().describe('Item category'),
            tags: z.array(z.string()).optional().describe('Tags (e.g., ["business", "personal"])'),
          })).describe('Array of receipt items'),
          fileId: z.string().optional().describe('Optional file ID to link items to specific receipt'),
        }),
        execute: async ({ transactionId, items, fileId }) => {
          // Use shared business logic
          const result = await receiptsData.saveReceiptItems(userId, transactionId, items, fileId);

          return {
            success: result.success,
            itemsCreated: result.itemsCreated,
            itemIds: result.itemIds,
            transactionId: result.transactionId,
          };
        },
      }),
    },
  });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    // Handle authentication errors
    console.error('[Chat API] Error:', error.message, error);
    if (error.message?.includes('Unauthorized')) {
      return Response.json({ error: 'Unauthorized: ' + error.message }, { status: 401 });
    }

    console.error('Error in chat:', error);
    return Response.json(
      { error: error.message || 'Chat request failed' },
      { status: 500 }
    );
  }
}
