/**
 * Script to batch process unmatched receipt images
 * This will:
 * 1. Fetch all unprocessed files (files without transactionId)
 * 2. Download each image from Appwrite Storage
 * 3. Process with Claude Vision via /api/files/process-receipt
 * 4. Search for matching transactions
 * 5. Link receipt to transaction if match found
 */

import { Client, Databases, Storage, Query } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const storage = new Storage(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID!;

async function main() {
  // Get all files without a transactionId
  const filesResponse = await databases.listDocuments(
    DATABASE_ID,
    'files',
    [Query.isNull('transactionId'), Query.limit(100)]
  );

  console.log(`Found ${filesResponse.documents.length} unprocessed files`);

  for (const file of filesResponse.documents) {
    console.log(`\nProcessing: ${file.fileName}`);
    
    try {
      // Download image from storage
      const imageBuffer = await storage.getFileView(BUCKET_ID, file.fileId);
      const base64Image = Buffer.from(imageBuffer).toString('base64');

      // Call process-receipt API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/files/process-receipt?userId=${file.userId}&fileId=${file.fileId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData: base64Image,
            mimeType: file.mimeType,
          }),
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        console.error(`  ❌ Processing failed: ${result.error}`);
        continue;
      }

      console.log(`  ✅ Extracted: ${result.receiptData.merchant} - $${result.receiptData.total}`);
      
      // TODO: Search for matching transaction and link
      // For now, just log success
      
    } catch (error) {
      console.error(`  ❌ Error:`, error);
    }
  }
}

main().catch(console.error);
