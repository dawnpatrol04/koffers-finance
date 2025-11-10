import { NextRequest, NextResponse } from 'next/server';
import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const fileId = searchParams.get('fileId');

    if (!userId || !fileId) {
      return NextResponse.json(
        { error: 'userId and fileId are required' },
        { status: 400 }
      );
    }

    // Get the file document from database
    const fileDoc = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.FILES,
      [
        { method: 'equal', attribute: 'fileId', values: [fileId] }
      ]
    );

    if (fileDoc.documents.length === 0) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const file = fileDoc.documents[0];

    // Get image data from request body (base64 encoded)
    const body = await request.json();
    const { imageData, mimeType } = body;

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

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
                media_type: mimeType || 'image/jpeg',
                data: imageData,
              },
            },
            {
              type: 'text',
              text: `Extract the following information from this receipt image and return it as JSON:

{
  "merchant": "Merchant name",
  "location": "Full address",
  "date": "YYYY-MM-DD",
  "time": "HH:MM:SS",
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
  "paymentMethod": "Card type (VISA, Mastercard, etc.)",
  "lastFourDigits": "1234"
}

Only return the JSON, no other text.`,
            },
          ],
        },
      ],
    });

    // Parse the response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const receiptData = JSON.parse(responseText);

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

    return NextResponse.json({
      success: true,
      receiptData,
    });
  } catch (error: any) {
    console.error('Receipt processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Processing failed' },
      { status: 500 }
    );
  }
}
