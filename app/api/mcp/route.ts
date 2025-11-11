import { NextRequest, NextResponse } from 'next/server';
import { databases, storage, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-server';
import { Query, ID } from 'node-appwrite';

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
    // Get API key from multiple sources: Authorization header, env, x-api-key header, OR query param
    const authHeader = request.headers.get('authorization');
    const url = new URL(request.url);
    const apiKey = authHeader?.replace('Bearer ', '') ||
                   process.env.KOFFERS_API_KEY ||
                   request.headers.get('x-api-key') ||
                   url.searchParams.get('apiKey') ||
                   url.searchParams.get('api_key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required. Set KOFFERS_API_KEY, use Authorization header, or pass as ?apiKey= query param.' },
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
          jsonrpc: '2.0',
          id: body.id,
          result: {
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
            },
            {
              name: 'list_unprocessed_files',
              description: 'Get list of files/receipts that have not been processed yet (ocrStatus=pending)',
              inputSchema: {
                type: 'object',
                properties: {
                  limit: {
                    type: 'number',
                    description: 'Max number of files to return (default: 50)'
                  }
                },
                required: []
              }
            },
            {
              name: 'view_file',
              description: 'View a file/receipt from storage. Returns images directly for Claude to see (as base64 ImageContent), PDFs as embedded resources. Use this to view receipts and extract information.',
              inputSchema: {
                type: 'object',
                properties: {
                  fileId: {
                    type: 'string',
                    description: 'The file ID from the files collection'
                  }
                },
                required: ['fileId']
              }
            },
            {
              name: 'search_transactions',
              description: 'Search for transactions by amount, date range, and optionally merchant name',
              inputSchema: {
                type: 'object',
                properties: {
                  amount: {
                    type: 'number',
                    description: 'Transaction amount to search for'
                  },
                  dateFrom: {
                    type: 'string',
                    description: 'Start date for search range (ISO format)'
                  },
                  dateTo: {
                    type: 'string',
                    description: 'End date for search range (ISO format)'
                  },
                  merchant: {
                    type: 'string',
                    description: 'Optional merchant name to filter by'
                  }
                },
                required: ['amount', 'dateFrom', 'dateTo']
              }
            },
            {
              name: 'link_file_to_transaction',
              description: 'Link a receipt file to a transaction and mark file as processed',
              inputSchema: {
                type: 'object',
                properties: {
                  fileId: {
                    type: 'string',
                    description: 'ID from files collection'
                  },
                  transactionId: {
                    type: 'string',
                    description: 'ID from transactions collection'
                  }
                },
                required: ['fileId', 'transactionId']
              }
            },
            {
              name: 'save_receipt_items',
              description: 'Save line items extracted from a receipt to the receiptItems collection',
              inputSchema: {
                type: 'object',
                properties: {
                  transactionId: {
                    type: 'string',
                    description: 'Transaction ID to link items to'
                  },
                  items: {
                    type: 'array',
                    description: 'Array of receipt line items',
                    items: {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string',
                          description: 'Item name/description'
                        },
                        quantity: {
                          type: 'number',
                          description: 'Quantity purchased'
                        },
                        price: {
                          type: 'number',
                          description: 'Unit price'
                        },
                        totalPrice: {
                          type: 'number',
                          description: 'Total price (quantity * price)'
                        },
                        category: {
                          type: 'string',
                          description: 'Optional item category'
                        },
                        sku: {
                          type: 'string',
                          description: 'Optional SKU/product code'
                        }
                      },
                      required: ['name', 'quantity', 'price']
                    }
                  }
                },
                required: ['transactionId', 'items']
              }
            },
            {
              name: 'refresh_transactions',
              description: 'Manually refresh and sync all transactions from Plaid for all connected accounts. This fetches the latest transactions from banks and updates the database.',
              inputSchema: {
                type: 'object',
                properties: {},
                required: []
              }
            }
          ]
          }
        });

      case 'tools/call':
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};

        switch (toolName) {
          case 'get_accounts':
            // Query the accounts collection (not PLAID_ACCOUNTS)
            const accountsResponse = await databases.listDocuments(
              DATABASE_ID,
              COLLECTIONS.ACCOUNTS,
              [Query.equal('userId', userId)]
            );

            return NextResponse.json({
              jsonrpc: '2.0',
              id: body.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    accounts: accountsResponse.documents.map((acc: any) => ({
                      id: acc.$id,
                      plaidAccountId: acc.plaidAccountId,
                      name: acc.name,
                      type: acc.type,
                      institution: acc.institution,
                      lastFour: acc.lastFour,
                      balance: acc.currentBalance,
                      currency: 'USD'
                    })),
                    total: accountsResponse.total
                  }, null, 2)
                }]
              }
            });

          case 'get_transactions':
            // Query plaidTransactions collection - filter by userId and accountId if provided
            const txnQueries = [Query.equal('userId', userId)];

            if (toolArgs.accountId) {
              txnQueries.push(Query.equal('plaidAccountId', toolArgs.accountId));
            }

            // Get more than requested since we'll filter in memory
            txnQueries.push(Query.limit(Math.min(toolArgs.limit || 50, 500)));
            txnQueries.push(Query.orderDesc('$createdAt'));

            const transactionsResponse = await databases.listDocuments(
              DATABASE_ID,
              COLLECTIONS.PLAID_TRANSACTIONS,
              txnQueries
            );

            // Parse rawData and filter/format transactions
            let transactions = transactionsResponse.documents
              .map((doc: any) => {
                try {
                  const txn = JSON.parse(doc.rawData);
                  return {
                    id: doc.$id,
                    plaidTransactionId: doc.plaidTransactionId,
                    accountId: doc.plaidAccountId,
                    date: txn.date || txn.authorized_date,
                    name: txn.name || txn.merchant_name,
                    amount: txn.amount,
                    category: txn.category ? txn.category.join(', ') : 'Uncategorized',
                    merchantName: txn.merchant_name || txn.name,
                    pending: txn.pending || false,
                    paymentChannel: txn.payment_channel
                  };
                } catch (e) {
                  console.error('Error parsing transaction rawData:', e);
                  return null;
                }
              })
              .filter((txn: any) => txn !== null);

            // Apply date filters if provided
            if (toolArgs.startDate) {
              transactions = transactions.filter((txn: any) => txn.date >= toolArgs.startDate);
            }
            if (toolArgs.endDate) {
              transactions = transactions.filter((txn: any) => txn.date <= toolArgs.endDate);
            }

            // Apply category filter if provided
            if (toolArgs.category) {
              transactions = transactions.filter((txn: any) =>
                txn.category.toLowerCase().includes(toolArgs.category.toLowerCase())
              );
            }

            // Sort by date descending
            transactions.sort((a: any, b: any) => b.date.localeCompare(a.date));

            return NextResponse.json({
              jsonrpc: '2.0',
              id: body.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    transactions: transactions.slice(0, toolArgs.limit || 50),
                    total: transactions.length,
                    rawTotal: transactionsResponse.total
                  }, null, 2)
                }]
              }
            });

          case 'get_spending_summary':
            const summaryEndDate = toolArgs.endDate || new Date().toISOString().split('T')[0];
            const summaryStartDate = toolArgs.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            // Get all transactions for user (we'll filter dates in memory)
            const summaryTransactions = await databases.listDocuments(
              DATABASE_ID,
              COLLECTIONS.PLAID_TRANSACTIONS,
              [
                Query.equal('userId', userId),
                Query.limit(5000) // Get up to 5000 transactions for summary
              ]
            );

            // Parse rawData, filter by date, and group by category
            const categoryTotals: Record<string, number> = {};
            let totalSpending = 0;

            summaryTransactions.documents.forEach((doc: any) => {
              try {
                const txn = JSON.parse(doc.rawData);
                const txnDate = txn.date || txn.authorized_date;

                // Filter by date range
                if (txnDate >= summaryStartDate && txnDate <= summaryEndDate) {
                  if (txn.amount > 0) { // Only count expenses (positive amounts in Plaid)
                    const category = txn.category ? txn.category.join(', ') : 'Uncategorized';
                    categoryTotals[category] = (categoryTotals[category] || 0) + txn.amount;
                    totalSpending += txn.amount;
                  }
                }
              } catch (e) {
                console.error('Error parsing transaction rawData:', e);
              }
            });

            return NextResponse.json({
              jsonrpc: '2.0',
              id: body.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    period: { startDate: summaryStartDate, endDate: summaryEndDate },
                    totalSpending,
                    categories: Object.entries(categoryTotals)
                      .map(([category, amount]) => ({
                        category,
                        amount,
                        percentage: totalSpending > 0 ? ((amount / totalSpending) * 100).toFixed(2) + '%' : '0%'
                      }))
                      .sort((a, b) => b.amount - a.amount)
                  }, null, 2)
                }]
              }
            });

          case 'list_unprocessed_files':
            const unprocessedFiles = await databases.listDocuments(
              DATABASE_ID,
              'files',
              [
                Query.equal('userId', userId),
                Query.equal('ocrStatus', 'pending'),
                Query.limit(toolArgs.limit || 50),
                Query.orderDesc('createdAt')
              ]
            );

            return NextResponse.json({
              jsonrpc: '2.0',
              id: body.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    files: unprocessedFiles.documents.map((f: any) => ({
                      id: f.$id,
                      fileId: f.fileId,
                      fileName: f.fileName,
                      mimeType: f.mimeType,
                      fileSize: f.fileSize,
                      createdAt: f.createdAt,
                      ocrStatus: f.ocrStatus
                    })),
                    total: unprocessedFiles.total
                  }, null, 2)
                }]
              }
            });

          case 'view_file':
          case 'download_file': // Keep backward compatibility
            // Get file metadata from database
            const fileRecords = await databases.listDocuments(
              DATABASE_ID,
              'files',
              [Query.equal('fileId', toolArgs.fileId), Query.limit(1)]
            );

            if (fileRecords.documents.length === 0) {
              throw new Error(`File not found: ${toolArgs.fileId}`);
            }

            const fileRecord = fileRecords.documents[0];

            // Download file from Appwrite storage
            const fileBuffer = await storage.getFileDownload('files', toolArgs.fileId);

            // Convert to base64
            const base64Data = Buffer.from(fileBuffer).toString('base64');

            // Return appropriate content type based on mimeType
            const mimeType = fileRecord.mimeType;
            const content: any[] = [];

            if (mimeType.startsWith('image/')) {
              // Return as ImageContent for vision processing
              content.push({
                type: 'image',
                data: base64Data,
                mimeType: mimeType
              });
              content.push({
                type: 'text',
                text: `Image: ${fileRecord.fileName}\nFile ID: ${toolArgs.fileId}\nSize: ${Math.round(fileRecord.fileSize / 1024)} KB\nType: ${mimeType}`
              });
            } else if (mimeType === 'application/pdf') {
              // Return as EmbeddedResource for PDFs
              content.push({
                type: 'resource',
                resource: {
                  uri: `file:///${fileRecord.fileName}`,
                  mimeType: 'application/pdf',
                  blob: base64Data
                }
              });
              content.push({
                type: 'text',
                text: `PDF Document: ${fileRecord.fileName}\nFile ID: ${toolArgs.fileId}\nSize: ${Math.round(fileRecord.fileSize / 1024)} KB\nPages: Use Claude's PDF processing to extract content`
              });
            } else {
              // Return as text with base64 for other file types
              content.push({
                type: 'text',
                text: `File: ${fileRecord.fileName}\nFile ID: ${toolArgs.fileId}\nSize: ${Math.round(fileRecord.fileSize / 1024)} KB\nType: ${mimeType}\n\nBase64 Data:\n${base64Data.substring(0, 200)}... (truncated)`
              });
            }

            return NextResponse.json({
              jsonrpc: '2.0',
              id: body.id,
              result: {
                content: content
              }
            });

          case 'search_transactions':
            const { amount, dateFrom, dateTo, merchant } = toolArgs;

            // Query plaid_transactions collection
            const searchQueries = [
              Query.equal('userId', userId),
              Query.greaterThanEqual('date', dateFrom),
              Query.lessThanEqual('date', dateTo),
              Query.limit(100)
            ];

            const txnResults = await databases.listDocuments(
              DATABASE_ID,
              COLLECTIONS.PLAID_TRANSACTIONS,
              searchQueries
            );

            // Filter by amount (with tolerance) and optionally merchant
            const matches = txnResults.documents
              .filter((txn: any) => {
                const rawData = JSON.parse(txn.rawData);
                const txnAmount = Math.abs(rawData.amount);
                const amountMatch = Math.abs(txnAmount - amount) < 0.01;
                const merchantName = rawData.merchant_name || rawData.name || '';
                const merchantMatch = !merchant ||
                  merchantName.toLowerCase().includes(merchant.toLowerCase());
                return amountMatch && merchantMatch;
              })
              .map((txn: any) => {
                const rawData = JSON.parse(txn.rawData);
                return {
                  id: txn.$id,
                  date: rawData.date || rawData.authorized_date,
                  amount: Math.abs(rawData.amount),
                  merchant: rawData.merchant_name || rawData.name,
                  name: rawData.name,
                  category: rawData.category ? rawData.category.join(', ') : 'Uncategorized',
                  fileId: txn.fileId,
                  hasReceipt: !!txn.fileId
                };
              });

            return NextResponse.json({
              jsonrpc: '2.0',
              id: body.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    matches,
                    total: matches.length,
                    searchParams: { amount, dateFrom, dateTo, merchant }
                  }, null, 2)
                }]
              }
            });

          case 'link_file_to_transaction':
            // Update plaid transaction with fileId
            await databases.updateDocument(
              DATABASE_ID,
              COLLECTIONS.PLAID_TRANSACTIONS,
              toolArgs.transactionId,
              { fileId: toolArgs.fileId }
            );

            // Update file ocrStatus to completed
            const filesToUpdate = await databases.listDocuments(
              DATABASE_ID,
              COLLECTIONS.FILES,
              [Query.equal('fileId', toolArgs.fileId), Query.limit(1)]
            );

            if (filesToUpdate.documents.length > 0) {
              await databases.updateDocument(
                DATABASE_ID,
                'files',
                filesToUpdate.documents[0].$id,
                { ocrStatus: 'completed' }
              );
            }

            return NextResponse.json({
              jsonrpc: '2.0',
              id: body.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    fileId: toolArgs.fileId,
                    transactionId: toolArgs.transactionId,
                    message: 'Receipt linked to transaction successfully'
                  }, null, 2)
                }]
              }
            });

          case 'save_receipt_items':
            const createdItems = [];

            for (let i = 0; i < toolArgs.items.length; i++) {
              const item = toolArgs.items[i];
              const newItem = await databases.createDocument(
                DATABASE_ID,
                'receiptItems',
                ID.unique(),
                {
                  transactionId: toolArgs.transactionId,
                  name: item.name,
                  quantity: item.quantity,
                  price: item.price,
                  totalPrice: item.totalPrice || (item.quantity * item.price),
                  category: item.category || null,
                  sku: item.sku || null,
                  sortOrder: i
                }
              );
              createdItems.push(newItem.$id);
            }

            return NextResponse.json({
              jsonrpc: '2.0',
              id: body.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    itemsCreated: createdItems.length,
                    itemIds: createdItems,
                    transactionId: toolArgs.transactionId
                  }, null, 2)
                }]
              }
            });

          case 'refresh_transactions':
            // Call the fetch-data API endpoint in background mode
            const fetchUrl = new URL('/api/plaid/fetch-data', request.url);

            const fetchResponse = await fetch(fetchUrl.toString(), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                userId,
                background: true // Enable background mode
              })
            });

            if (!fetchResponse.ok) {
              const errorData = await fetchResponse.json();
              throw new Error(errorData.error || 'Failed to refresh transactions');
            }

            const refreshData = await fetchResponse.json();

            // Return immediately with jobId
            return NextResponse.json({
              jsonrpc: '2.0',
              id: body.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    message: 'Transaction sync started in background',
                    jobId: refreshData.jobId,
                    statusUrl: `/api/plaid/sync-status?userId=${userId}&jobId=${refreshData.jobId}`,
                    instructions: 'Check sync status by visiting the status URL or wait a moment and check your transaction count'
                  }, null, 2)
                }]
              }
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
