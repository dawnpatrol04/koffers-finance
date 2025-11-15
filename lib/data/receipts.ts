/**
 * Receipt Items Business Logic
 * Shared between Chat AI tools and MCP server
 */

import { DATABASE_ID, COLLECTIONS, ID } from '@/lib/appwrite-config';
import { createAdminClient } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  totalPrice?: number;
  category?: string;
  tags?: string[];
}

export interface ReceiptItemRecord extends ReceiptItem {
  id: string;
  userId: string;
  transactionId: string;
  fileId?: string;
  totalPrice: number;
}

export interface SaveReceiptItemsResult {
  success: boolean;
  itemsCreated: number;
  itemIds: string[];
  transactionId: string;
}

/**
 * Save receipt line items to database
 * @param userId - The user's ID
 * @param transactionId - The transaction ID these items belong to
 * @param items - Array of receipt items
 * @param fileId - Optional file ID to link items to specific receipt file
 * @returns Result with created item IDs
 * @throws Error if items array is empty or invalid
 */
export async function saveReceiptItems(
  userId: string,
  transactionId: string,
  items: ReceiptItem[],
  fileId?: string
): Promise<SaveReceiptItemsResult> {
  const { databases } = await createAdminClient();
  if (!items || items.length === 0) {
    throw new Error('items array cannot be empty');
  }

  const createdItems: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Validate item fields
    if (!item.name || item.quantity === undefined || item.price === undefined) {
      console.error(`Invalid item at index ${i}:`, item);
      continue; // Skip invalid items
    }

    const newItem = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.RECEIPT_ITEMS,
      ID.unique(),
      {
        userId,
        transactionId,
        fileId: fileId || null,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice || (item.quantity * item.price),
        category: item.category || null,
        tags: item.tags || []
      }
    );

    createdItems.push(newItem.$id);
  }

  return {
    success: true,
    itemsCreated: createdItems.length,
    itemIds: createdItems,
    transactionId,
  };
}

/**
 * Get receipt items for a specific transaction
 * @param userId - The user's ID (for security)
 * @param transactionId - The transaction ID
 * @returns Array of receipt items
 */
export async function getReceiptItemsByTransaction(
  userId: string,
  transactionId: string
): Promise<ReceiptItemRecord[]> {
  const { databases } = await createAdminClient();
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.RECEIPT_ITEMS,
    [
      Query.equal('userId', userId),
      Query.equal('transactionId', transactionId),
      Query.limit(500) // A receipt shouldn't have more than 500 items
    ]
  );

  return response.documents.map((item: any) => ({
    id: item.$id,
    userId: item.userId,
    transactionId: item.transactionId,
    fileId: item.fileId,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    totalPrice: item.totalPrice,
    category: item.category,
    tags: item.tags || [],
  }));
}

/**
 * Get receipt items for a specific file
 * @param userId - The user's ID (for security)
 * @param fileId - The file ID
 * @returns Array of receipt items
 */
export async function getReceiptItemsByFile(
  userId: string,
  fileId: string
): Promise<ReceiptItemRecord[]> {
  const { databases } = await createAdminClient();
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.RECEIPT_ITEMS,
    [
      Query.equal('userId', userId),
      Query.equal('fileId', fileId),
      Query.limit(500)
    ]
  );

  return response.documents.map((item: any) => ({
    id: item.$id,
    userId: item.userId,
    transactionId: item.transactionId,
    fileId: item.fileId,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    totalPrice: item.totalPrice,
    category: item.category,
    tags: item.tags || [],
  }));
}

/**
 * Delete receipt items for a transaction
 * @param userId - The user's ID (for security)
 * @param transactionId - The transaction ID
 * @returns Number of items deleted
 */
export async function deleteReceiptItemsByTransaction(
  userId: string,
  transactionId: string
): Promise<number> {
  const { databases } = await createAdminClient();
  const items = await getReceiptItemsByTransaction(userId, transactionId);

  for (const item of items) {
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.RECEIPT_ITEMS,
      item.id
    );
  }

  return items.length;
}
