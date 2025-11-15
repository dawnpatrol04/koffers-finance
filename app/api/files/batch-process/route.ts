import { NextRequest, NextResponse } from 'next/server';
import { DATABASE_ID, COLLECTIONS, STORAGE_BUCKETS } from '@/lib/appwrite-config';
import { createAdminClient } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { databases, storage } = await createAdminClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '5');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get all files - we'll filter out ones with transactionId in code
    const filesResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.FILES,
      [
        Query.equal('userId', userId),
        Query.limit(100)
      ]
    );

    // Log all transactionId values to debug
    console.log('File transaction IDs:', filesResponse.documents.map((f: any) => ({
      name: f.fileName,
      txnId: f.transactionId,
      type: typeof f.transactionId
    })));

    // Filter to only unprocessed files (no transactionId or null/undefined)
    const unprocessedFiles = filesResponse.documents
      .filter((f: any) => !f.transactionId || f.transactionId === null || f.transactionId === '')
      .slice(0, limit);

    console.log(`Found ${unprocessedFiles.length} unprocessed files out of ${filesResponse.documents.length} total for user ${userId}`);

    const results = [];

    for (const file of unprocessedFiles) {
      console.log(`\nProcessing: ${file.fileName} (${file.fileId})`);

      try {
        // Download image from storage
        const imageBuffer = await storage.getFileView(STORAGE_BUCKETS.FILES, file.fileId);
        const base64Image = Buffer.from(imageBuffer as Buffer).toString('base64');

        // Process with Claude Vision
        const message = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: file.mimeType || 'image/jpeg',
                    data: base64Image,
                  },
                },
                {
                  type: 'text',
                  text: `Extract the following information from this receipt image and return it as JSON:

{
  "merchant": "Merchant name",
  "location": "Full address if visible",
  "date": "YYYY-MM-DD",
  "time": "HH:MM:SS if visible",
  "items": [
    {
      "name": "Item name",
      "quantity": 1,
      "price": 0.00,
      "totalPrice": 0.00
    }
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "tip": 0.00,
  "total": 0.00,
  "paymentMethod": "Card type if visible",
  "lastFourDigits": "1234 if visible"
}

Only return the JSON, no other text. If a field is not visible, use null.`,
                },
              ],
            },
          ],
        });

        // Parse the response
        const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
        const receiptData = JSON.parse(responseText);

        console.log(`  ✅ Extracted: ${receiptData.merchant} - $${receiptData.total} on ${receiptData.date}`);

        // Update file document with OCR data
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.FILES,
          file.$id,
          {
            ocrStatus: 'completed',
            receiptData: JSON.stringify(receiptData),
            processedAt: new Date().toISOString(),
          }
        );

        // Search for matching transaction
        const transactionsResponse = await databases.listDocuments(
          DATABASE_ID,
          'plaidTransactions',
          [
            Query.equal('userId', userId),
            Query.limit(100)
          ]
        );

        let matchedTransaction = null;

        for (const txn of transactionsResponse.documents) {
          const txnData = JSON.parse(txn.rawData);
          const txnDate = txnData.date;
          const txnAmount = Math.abs(txnData.amount);
          const txnMerchant = (txnData.merchant_name || txnData.name || '').toLowerCase();

          // Match criteria:
          // 1. Amount matches (within $0.50)
          // 2. Date matches (within 3 days)
          // 3. Merchant name similar (optional)

          const receiptAmount = receiptData.total;
          const receiptDate = receiptData.date;
          const receiptMerchant = (receiptData.merchant || '').toLowerCase();

          const amountDiff = Math.abs(txnAmount - receiptAmount);
          const dateDiff = Math.abs(new Date(txnDate).getTime() - new Date(receiptDate).getTime()) / (1000 * 60 * 60 * 24);

          if (amountDiff <= 0.50 && dateDiff <= 3) {
            console.log(`  🎯 Match found: ${txnMerchant} ($${txnAmount}) on ${txnDate}`);
            matchedTransaction = txn;
            break;
          }
        }

        if (matchedTransaction) {
          // Link file to transaction
          await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.FILES,
            file.$id,
            {
              transactionId: matchedTransaction.$id,
            }
          );

          console.log(`  ✅ Linked to transaction ${matchedTransaction.$id}`);
        } else {
          console.log(`  ⚠️  No matching transaction found`);
        }

        results.push({
          fileName: file.fileName,
          success: true,
          receiptData,
          matched: !!matchedTransaction,
          transactionId: matchedTransaction?.$id,
        });

      } catch (error: any) {
        console.error(`  ❌ Error processing ${file.fileName}:`, error.message);

        // Mark as failed
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.FILES,
          file.$id,
          {
            ocrStatus: 'failed',
            processedAt: new Date().toISOString(),
          }
        );

        results.push({
          fileName: file.fileName,
          success: false,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });

  } catch (error: any) {
    console.error('Batch processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Processing failed' },
      { status: 500 }
    );
  }
}
