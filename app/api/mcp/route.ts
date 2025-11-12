import { NextRequest, NextResponse } from 'next/server';
import { DATABASE_ID, COLLECTIONS, STORAGE_BUCKETS, ID } from '@/lib/appwrite-config';
import { databases, storage } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import heicConvert from 'heic-convert';
import { fileTypeFromBuffer } from 'file-type';
import * as accountsData from '@/lib/data/accounts';
import * as transactionsData from '@/lib/data/transactions';
import * as filesData from '@/lib/data/files';
import * as receiptsData from '@/lib/data/receipts';

/**
 * MCP (Model Context Protocol) Server Endpoint
 *
 * This endpoint exposes user financial data via MCP for Claude Desktop integration.
 * Authentication is done via API keys created in the Developer settings.
 */

// Allow up to 60 seconds for file downloads and processing
export const maxDuration = 60;

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

// Helper function to create error responses with isError flag
// This ensures LLM sees errors in context and can recover
function createErrorResponse(id: any, toolName: string, error: any, suggestion?: string) {
  const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
  const suggestionText = suggestion || 'Please check your parameters and try again. If this persists, the server may be experiencing issues.';

  return NextResponse.json({
    jsonrpc: '2.0',
    id,
    result: {
      isError: true,
      content: [{
        type: 'text',
        text: `❌ Error executing '${toolName}': ${errorMessage}\n\n💡 Suggestion: ${suggestionText}`
      }]
    }
  });
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
                  },
                  fileType: {
                    type: 'string',
                    description: 'Type of file: receipt, return, warranty, invoice, note, other (default: receipt)',
                    enum: ['receipt', 'return', 'warranty', 'invoice', 'note', 'other']
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
                  fileId: {
                    type: 'string',
                    description: 'Optional file ID to link items to specific receipt file'
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
                        tags: {
                          type: 'array',
                          items: { type: 'string' },
                          description: 'Optional tags (e.g., ["business", "personal"])'
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
            },
            {
              name: 'upload_file',
              description: 'Upload a file/receipt to Koffers storage. Accepts images (JPEG, PNG, HEIC) and PDFs as base64-encoded data. HEIC files are automatically converted to JPEG. Returns fileId for use with other tools.',
              inputSchema: {
                type: 'object',
                properties: {
                  fileData: {
                    type: 'string',
                    description: 'Base64-encoded file data'
                  },
                  fileName: {
                    type: 'string',
                    description: 'Required filename with extension (e.g., "receipt.jpg", "IMG_6118.HEIC")'
                  },
                  mimeType: {
                    type: 'string',
                    description: 'Optional MIME type (e.g., "image/jpeg", "image/heic"). Will be auto-detected if omitted.'
                  }
                },
                required: ['fileData', 'fileName']
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
            try {
              // Use shared business logic
              const summary = await accountsData.getAccountsSummary(userId);

              return NextResponse.json({
                jsonrpc: '2.0',
                id: body.id,
                result: {
                  content: [{
                    type: 'text',
                    text: JSON.stringify({
                      accounts: summary.accounts,
                      totalBalance: summary.totalBalance,
                      total: summary.accountCount
                    }, null, 2)
                  }]
                }
              });
            } catch (error) {
              console.error('[get_accounts] Error:', error);
              return createErrorResponse(
                body.id,
                'get_accounts',
                error,
                'Unable to retrieve bank accounts. The accounts collection may be empty or the database may be unavailable.'
              );
            }

          case 'get_transactions':
            try {
              // Use shared business logic
              const transactions = await transactionsData.getTransactions(userId, {
                limit: toolArgs.limit,
                accountId: toolArgs.accountId,
                category: toolArgs.category,
                dateFrom: toolArgs.startDate,
                dateTo: toolArgs.endDate,
              });

              return NextResponse.json({
                jsonrpc: '2.0',
                id: body.id,
                result: {
                  content: [{
                    type: 'text',
                    text: JSON.stringify({
                      transactions,
                      total: transactions.length
                    }, null, 2)
                  }]
                }
              });
            } catch (error) {
              console.error('[get_transactions] Error:', error);
              return createErrorResponse(
                body.id,
                'get_transactions',
                error,
                'Unable to retrieve transactions. Check that transactions exist in the database and the accountId (if provided) is valid.'
              );
            }

          case 'get_spending_summary':
            try {
              // Use shared business logic
              const summary = await transactionsData.getSpendingSummary(
                userId,
                toolArgs.startDate,
                toolArgs.endDate
              );

              return NextResponse.json({
                jsonrpc: '2.0',
                id: body.id,
                result: {
                  content: [{
                    type: 'text',
                    text: JSON.stringify(summary, null, 2)
                  }]
                }
              });
            } catch (error) {
              console.error('[get_spending_summary] Error:', error);
              return createErrorResponse(
                body.id,
                'get_spending_summary',
                error,
                'Unable to generate spending summary. Check that transactions exist for the specified date range.'
              );
            }

          case 'list_unprocessed_files':
            try {
              // Use shared business logic
              const files = await filesData.listUnprocessedFiles(userId, toolArgs.limit || 50);

              return NextResponse.json({
                jsonrpc: '2.0',
                id: body.id,
                result: {
                  content: [{
                    type: 'text',
                    text: JSON.stringify({
                      files,
                      total: files.length
                    }, null, 2)
                  }]
                }
              });
            } catch (error) {
              console.error('[list_unprocessed_files] Error:', error);
              return createErrorResponse(
                body.id,
                'list_unprocessed_files',
                error,
                'Unable to retrieve unprocessed files. The files collection may be empty or unavailable.'
              );
            }

          case 'view_file':
          case 'download_file': // Keep backward compatibility
            try {
              // Validate fileId parameter
              if (!toolArgs.fileId) {
                throw new Error('fileId parameter is required');
              }

              // Use shared business logic
              const fileData = await filesData.viewFile(userId, toolArgs.fileId);

              // Return appropriate content type based on mimeType
              const content: any[] = [];

              if (fileData.mimeType.startsWith('image/')) {
                // Return as ImageContent for vision processing
                content.push({
                  type: 'image',
                  data: fileData.base64Data,
                  mimeType: fileData.mimeType
                });
                content.push({
                  type: 'text',
                  text: `Image: ${fileData.fileName}\nFile ID: ${fileData.fileId}\nSize: ${fileData.fileSizeKB} KB\nType: ${fileData.mimeType}`
                });
              } else if (fileData.mimeType === 'application/pdf') {
                // Return as EmbeddedResource for PDFs
                content.push({
                  type: 'resource',
                  resource: {
                    uri: `file:///${fileData.fileName}`,
                    mimeType: 'application/pdf',
                    blob: fileData.base64Data
                  }
                });
                content.push({
                  type: 'text',
                  text: `PDF Document: ${fileData.fileName}\nFile ID: ${fileData.fileId}\nSize: ${fileData.fileSizeKB} KB\nPages: Use Claude's PDF processing to extract content`
                });
              } else {
                // Return as text with base64 for other file types
                content.push({
                  type: 'text',
                  text: `File: ${fileData.fileName}\nFile ID: ${fileData.fileId}\nSize: ${fileData.fileSizeKB} KB\nType: ${fileData.mimeType}\n\nBase64 Data:\n${fileData.base64Data.substring(0, 200)}... (truncated)`
                });
              }

              return NextResponse.json({
                jsonrpc: '2.0',
                id: body.id,
                result: {
                  content: content
                }
              });
            } catch (error) {
              console.error('[view_file] Error:', error);
              return createErrorResponse(
                body.id,
                'view_file',
                error,
                'Unable to retrieve file. Check that the fileId is correct and the file exists in storage. Use list_unprocessed_files to see available files.'
              );
            }

          case 'search_transactions':
            try {
              const { amount, dateFrom, dateTo, merchant } = toolArgs;

              // Validate required parameters
              if (amount === undefined || !dateFrom || !dateTo) {
                throw new Error('amount, dateFrom, and dateTo are required parameters');
              }

              // Use shared business logic (the complex search that took 15 rounds to perfect!)
              const matches = await transactionsData.searchTransactions(
                userId,
                amount,
                dateFrom,
                dateTo,
                merchant
              );

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
            } catch (error) {
              console.error('[search_transactions] Error:', error);
              return createErrorResponse(
                body.id,
                'search_transactions',
                error,
                'Unable to search transactions. Ensure amount, dateFrom, and dateTo are provided in correct format (ISO date: YYYY-MM-DD).'
              );
            }

          case 'link_file_to_transaction':
            try {
              // Validate parameters
              if (!toolArgs.fileId || !toolArgs.transactionId) {
                throw new Error('fileId and transactionId are both required parameters');
              }

              // Use shared business logic
              const result = await filesData.linkFileToTransaction(
                userId,
                toolArgs.fileId,
                toolArgs.transactionId,
                toolArgs.fileType || 'receipt'
              );

              return NextResponse.json({
                jsonrpc: '2.0',
                id: body.id,
                result: {
                  content: [{
                    type: 'text',
                    text: JSON.stringify({
                      ...result,
                      message: 'Receipt linked to transaction successfully'
                    }, null, 2)
                  }]
                }
              });
            } catch (error) {
              console.error('[link_file_to_transaction] Error:', error);
              return createErrorResponse(
                body.id,
                'link_file_to_transaction',
                error,
                'Unable to link file to transaction. Ensure both fileId and transactionId are valid and exist in the database.'
              );
            }

          case 'save_receipt_items':
            try {
              // Validate parameters
              if (!toolArgs.transactionId || !toolArgs.items || !Array.isArray(toolArgs.items)) {
                throw new Error('transactionId and items array are required parameters');
              }

              // Use shared business logic
              const result = await receiptsData.saveReceiptItems(
                userId,
                toolArgs.transactionId,
                toolArgs.items,
                toolArgs.fileId
              );

              return NextResponse.json({
                jsonrpc: '2.0',
                id: body.id,
                result: {
                  content: [{
                    type: 'text',
                    text: JSON.stringify(result, null, 2)
                  }]
                }
              });
            } catch (error) {
              console.error('[save_receipt_items] Error:', error);
              return createErrorResponse(
                body.id,
                'save_receipt_items',
                error,
                'Unable to save receipt items. Ensure transactionId is valid and items array contains valid objects with name, quantity, and price fields.'
              );
            }

          case 'refresh_transactions':
            try {
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
                throw new Error(errorData.error || `Plaid API returned ${fetchResponse.status}`);
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
            } catch (error) {
              console.error('[refresh_transactions] Error:', error);
              return createErrorResponse(
                body.id,
                'refresh_transactions',
                error,
                'Unable to refresh transactions from Plaid. The Plaid API may be unavailable or your Plaid items may need reconnection.'
              );
            }

          case 'upload_file':
            try {
              const { fileData, fileName, mimeType: providedMimeType } = toolArgs;

              // Validate parameters
              if (!fileData || !fileName) {
                throw new Error('fileData and fileName are both required parameters');
              }

              // Decode base64 file data
              let buffer;
              try {
                buffer = Buffer.from(fileData, 'base64');
              } catch (e) {
                throw new Error('Invalid base64 fileData. Ensure the file is properly base64-encoded.');
              }

              // Check file size (20MB limit)
              const maxSize = 20 * 1024 * 1024;
              if (buffer.length > maxSize) {
                throw new Error(`File too large: ${Math.round(buffer.length / 1024 / 1024)}MB. Maximum size is 20MB. Consider compressing the image.`);
              }

              if (buffer.length === 0) {
                throw new Error('File is empty (0 bytes). Ensure the fileData is not empty.');
              }

              // Detect file type
              const detectedType = await fileTypeFromBuffer(buffer);
              let finalMimeType = providedMimeType || detectedType?.mime || 'application/octet-stream';
              let finalFileName = fileName;
              let finalBuffer = buffer;

              // Convert HEIC to JPEG
              if (detectedType?.mime === 'image/heic' || detectedType?.mime === 'image/heif') {
                console.log('Converting HEIC to JPEG...');

                const outputBuffer = await heicConvert({
                  buffer: buffer,
                  format: 'JPEG',
                  quality: 0.9
                });

                finalBuffer = Buffer.from(outputBuffer);
                finalMimeType = 'image/jpeg';
                finalFileName = finalFileName.replace(/\.(heic|heif)$/i, '.jpg');

                console.log(`Converted ${buffer.length} bytes → ${finalBuffer.length} bytes`);
              }

              // Upload to Appwrite Storage
              const uploadedFile = await storage.createFile(
                STORAGE_BUCKETS.FILES,
                ID.unique(),
                InputFile.fromBuffer(finalBuffer, finalFileName),
                [`read("user:${userId}")`, `delete("user:${userId}")`]
              );

              console.log(`Uploaded to storage: ${uploadedFile.$id}`);

              // Create file metadata in database
              const fileDoc = await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.FILES,
                ID.unique(),
                {
                  userId,
                  fileId: uploadedFile.$id,
                  fileName: finalFileName,
                  mimeType: finalMimeType,
                  fileSize: finalBuffer.length,
                  fileType: 'receipt', // Default to receipt for uploaded files
                  ocrStatus: 'pending',
                  createdAt: new Date().toISOString(),
                }
              );

              return NextResponse.json({
                jsonrpc: '2.0',
                id: body.id,
                result: {
                  content: [{
                    type: 'text',
                    text: JSON.stringify({
                      success: true,
                      fileId: uploadedFile.$id,
                      documentId: fileDoc.$id,
                      fileName: finalFileName,
                      mimeType: finalMimeType,
                      fileSize: finalBuffer.length,
                      message: `Successfully uploaded ${finalFileName} (${Math.round(finalBuffer.length / 1024)} KB)`
                    }, null, 2)
                  }]
                }
              });
            } catch (error) {
              console.error('[upload_file] Error:', error);
              return createErrorResponse(
                body.id,
                'upload_file',
                error,
                'Unable to upload file. Ensure fileData is valid base64 and fileName includes extension (e.g., "receipt.jpg"). File must be under 20MB.'
              );
            }

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
