import { NextRequest, NextResponse } from 'next/server';
import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';

/**
 * MCP (Model Context Protocol) Server Endpoint
 *
 * This endpoint exposes user financial data via MCP for Claude Desktop integration.
 * Authentication is done via API keys created in the Developer settings.
 */

// Validate API key and return userId
async function validateApiKey(apiKey: string): Promise<string | null> {
  if (!apiKey || !apiKey.startsWith('kf_live_')) {
    return null;
  }

  try {
    const keysResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.API_KEYS,
      [Query.equal('keyValue', apiKey), Query.limit(1)]
    );

    if (keysResponse.documents.length === 0) {
      return null;
    }

    const keyDoc = keysResponse.documents[0];

    // Check if key is expired
    if (keyDoc.expiresAt && new Date(keyDoc.expiresAt) < new Date()) {
      return null;
    }

    // Update lastUsedAt timestamp
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.API_KEYS,
      keyDoc.$id,
      { lastUsedAt: new Date().toISOString() }
    );

    return keyDoc.userId;
  } catch (error) {
    console.error('API key validation error:', error);
    return null;
  }
}

// MCP Server handler
export async function POST(request: NextRequest) {
  try {
    // Get API key from Authorization header or env
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '') ||
                   process.env.KOFFERS_API_KEY ||
                   request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required. Set KOFFERS_API_KEY or use Authorization header.' },
        { status: 401 }
      );
    }

    // Validate API key
    const userId = await validateApiKey(apiKey);
    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid or expired API key' },
        { status: 403 }
      );
    }

    // Parse MCP request
    const body = await request.json();
    const { method, params } = body;

    // Handle MCP methods
    switch (method) {
      case 'initialize':
        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'Koffers Finance MCP',
              version: '1.0.0'
            }
          }
        });

      case 'notifications/initialized':
        // Client notifies server that initialization is complete
        // MCP protocol requires 204 No Content response for notifications
        return new NextResponse(null, { status: 204 });

      case 'tools/list':
        return NextResponse.json({
          tools: [
            {
              name: 'get_accounts',
              description: 'Get all connected bank accounts with current balances',
              inputSchema: {
                type: 'object',
                properties: {},
                required: []
              }
            },
            {
              name: 'get_transactions',
              description: 'Get recent transactions with optional filtering',
              inputSchema: {
                type: 'object',
                properties: {
                  limit: {
                    type: 'number',
                    description: 'Number of transactions to return (default: 50, max: 500)'
                  },
                  accountId: {
                    type: 'string',
                    description: 'Filter by specific account ID'
                  },
                  category: {
                    type: 'string',
                    description: 'Filter by transaction category'
                  },
                  startDate: {
                    type: 'string',
                    description: 'Filter transactions after this date (ISO format)'
                  },
                  endDate: {
                    type: 'string',
                    description: 'Filter transactions before this date (ISO format)'
                  }
                },
                required: []
              }
            },
            {
              name: 'get_spending_summary',
              description: 'Get spending summary grouped by category for a time period',
              inputSchema: {
                type: 'object',
                properties: {
                  startDate: {
                    type: 'string',
                    description: 'Start date (ISO format, defaults to 30 days ago)'
                  },
                  endDate: {
                    type: 'string',
                    description: 'End date (ISO format, defaults to today)'
                  }
                },
                required: []
              }
            }
          ]
        });

      case 'tools/call':
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};

        switch (toolName) {
          case 'get_accounts':
            const accountsResponse = await databases.listDocuments(
              DATABASE_ID,
              COLLECTIONS.PLAID_ACCOUNTS,
              [Query.equal('userId', userId)]
            );

            return NextResponse.json({
              content: [{
                type: 'text',
                text: JSON.stringify({
                  accounts: accountsResponse.documents.map((acc: any) => ({
                    id: acc.$id,
                    name: acc.name,
                    type: acc.type,
                    subtype: acc.subtype,
                    balance: acc.balances?.current || 0,
                    currency: acc.balances?.iso_currency_code || 'USD'
                  })),
                  total: accountsResponse.total
                }, null, 2)
              }]
            });

          case 'get_transactions':
            const queries = [Query.equal('userId', userId)];

            if (toolArgs.accountId) {
              queries.push(Query.equal('accountId', toolArgs.accountId));
            }

            if (toolArgs.category) {
              queries.push(Query.equal('category', toolArgs.category));
            }

            if (toolArgs.startDate) {
              queries.push(Query.greaterThanEqual('date', toolArgs.startDate));
            }

            if (toolArgs.endDate) {
              queries.push(Query.lessThanEqual('date', toolArgs.endDate));
            }

            queries.push(Query.limit(Math.min(toolArgs.limit || 50, 500)));
            queries.push(Query.orderDesc('date'));

            const transactionsResponse = await databases.listDocuments(
              DATABASE_ID,
              COLLECTIONS.PLAID_TRANSACTIONS,
              queries
            );

            return NextResponse.json({
              content: [{
                type: 'text',
                text: JSON.stringify({
                  transactions: transactionsResponse.documents.map((txn: any) => ({
                    id: txn.$id,
                    date: txn.date,
                    name: txn.name,
                    amount: txn.amount,
                    category: txn.category,
                    merchantName: txn.merchantName,
                    pending: txn.pending
                  })),
                  total: transactionsResponse.total
                }, null, 2)
              }]
            });

          case 'get_spending_summary':
            const endDate = toolArgs.endDate || new Date().toISOString().split('T')[0];
            const startDate = toolArgs.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const summaryTransactions = await databases.listDocuments(
              DATABASE_ID,
              COLLECTIONS.PLAID_TRANSACTIONS,
              [
                Query.equal('userId', userId),
                Query.greaterThanEqual('date', startDate),
                Query.lessThanEqual('date', endDate),
                Query.limit(5000) // Get up to 5000 transactions for summary
              ]
            );

            // Group by category and calculate totals
            const categoryTotals: Record<string, number> = {};
            let totalSpending = 0;

            summaryTransactions.documents.forEach((txn: any) => {
              if (txn.amount > 0) { // Only count expenses (positive amounts in Plaid)
                const category = txn.category || 'Uncategorized';
                categoryTotals[category] = (categoryTotals[category] || 0) + txn.amount;
                totalSpending += txn.amount;
              }
            });

            return NextResponse.json({
              content: [{
                type: 'text',
                text: JSON.stringify({
                  period: { startDate, endDate },
                  totalSpending,
                  categories: Object.entries(categoryTotals)
                    .map(([category, amount]) => ({
                      category,
                      amount,
                      percentage: ((amount / totalSpending) * 100).toFixed(2) + '%'
                    }))
                    .sort((a, b) => b.amount - a.amount)
                }, null, 2)
              }]
            });

          default:
            return NextResponse.json(
              { error: `Unknown tool: ${toolName}` },
              { status: 400 }
            );
        }

      case 'resources/list':
        return NextResponse.json({
          resources: [
            {
              uri: 'koffers://accounts',
              name: 'Bank Accounts',
              description: 'All connected bank accounts',
              mimeType: 'application/json'
            },
            {
              uri: 'koffers://transactions/recent',
              name: 'Recent Transactions',
              description: 'Last 100 transactions',
              mimeType: 'application/json'
            }
          ]
        });

      case 'resources/read':
        const resourceUri = params?.uri;

        if (resourceUri === 'koffers://accounts') {
          const accounts = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.PLAID_ACCOUNTS,
            [Query.equal('userId', userId)]
          );

          return NextResponse.json({
            contents: [{
              uri: resourceUri,
              mimeType: 'application/json',
              text: JSON.stringify(accounts.documents, null, 2)
            }]
          });
        }

        if (resourceUri === 'koffers://transactions/recent') {
          const transactions = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.PLAID_TRANSACTIONS,
            [
              Query.equal('userId', userId),
              Query.limit(100),
              Query.orderDesc('date')
            ]
          );

          return NextResponse.json({
            contents: [{
              uri: resourceUri,
              mimeType: 'application/json',
              text: JSON.stringify(transactions.documents, null, 2)
            }]
          });
        }

        return NextResponse.json(
          { error: `Unknown resource: ${resourceUri}` },
          { status: 404 }
        );

      default:
        return NextResponse.json(
          { error: `Unsupported method: ${method}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('MCP server error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle GET requests with server info
export async function GET() {
  return NextResponse.json({
    name: 'Koffers Finance MCP Server',
    version: '1.0.0',
    description: 'Model Context Protocol server for accessing Koffers financial data',
    protocol_version: '2024-11-05',
    capabilities: {
      tools: true,
      resources: true
    },
    authentication: {
      type: 'api_key',
      instructions: 'Create an API key at https://koffers.ai/dashboard/settings/developer and set it in the KOFFERS_API_KEY environment variable'
    }
  });
}
