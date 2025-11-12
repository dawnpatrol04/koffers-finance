/**
 * Files Business Logic
 * Shared between Chat AI tools and MCP server
 */

import { databases, storage, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';

export interface FileRecord {
  id: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  ocrStatus: 'pending' | 'completed' | 'failed';
  transactionId?: string;
  fileType?: 'receipt' | 'return' | 'warranty' | 'invoice' | 'note' | 'other';
}

export interface FileViewResult {
  id: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileSizeKB: number;
  base64Data: string;
  transactionId?: string;
}

/**
 * List files that haven't been processed yet (ocrStatus = pending)
 * @param userId - The user's ID
 * @param limit - Max number of files to return (default: 50)
 * @returns Array of unprocessed files
 */
export async function listUnprocessedFiles(
  userId: string,
  limit: number = 50
): Promise<FileRecord[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.FILES,
    [
      Query.equal('userId', userId),
      Query.equal('ocrStatus', 'pending'),
      Query.limit(limit),
      Query.orderDesc('$createdAt')
    ]
  );

  return response.documents.map((f: any) => ({
    id: f.$id,
    fileId: f.fileId,
    fileName: f.fileName,
    mimeType: f.mimeType,
    fileSize: f.fileSize,
    createdAt: f.$createdAt,
    ocrStatus: f.ocrStatus,
    transactionId: f.transactionId,
    fileType: f.fileType,
  }));
}

/**
 * Get file by fileId (Appwrite storage ID)
 * @param userId - The user's ID (for security)
 * @param fileId - The Appwrite storage file ID
 * @returns File metadata and base64 data
 * @throws Error if file not found or user doesn't own it
 */
export async function viewFile(
  userId: string,
  fileId: string
): Promise<FileViewResult> {
  // Get file metadata from database
  const fileRecords = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.FILES,
    [
      Query.equal('userId', userId),
      Query.equal('fileId', fileId),
      Query.limit(1)
    ]
  );

  if (fileRecords.documents.length === 0) {
    throw new Error(`File not found with ID: ${fileId}. File may have been deleted or you may not have permission to access it.`);
  }

  const fileRecord = fileRecords.documents[0];

  // Download file from Appwrite storage
  const fileBuffer = await storage.getFileDownload('files', fileId);

  // Convert to base64
  const base64Data = Buffer.from(fileBuffer).toString('base64');

  return {
    id: fileRecord.$id,
    fileId: fileRecord.fileId,
    fileName: fileRecord.fileName,
    mimeType: fileRecord.mimeType,
    fileSize: fileRecord.fileSize,
    fileSizeKB: Math.round(fileRecord.fileSize / 1024),
    base64Data,
    transactionId: fileRecord.transactionId,
  };
}

/**
 * Link a file/receipt to a transaction
 * @param userId - The user's ID (for security)
 * @param fileId - The Appwrite storage file ID
 * @param transactionId - The transaction ID to link to
 * @param fileType - Type of file (default: 'receipt')
 * @returns Success result
 * @throws Error if file not found or user doesn't own it
 */
export async function linkFileToTransaction(
  userId: string,
  fileId: string,
  transactionId: string,
  fileType: 'receipt' | 'return' | 'warranty' | 'invoice' | 'note' | 'other' = 'receipt'
): Promise<{ success: boolean; fileId: string; transactionId: string; fileType: string }> {
  // Find the file document by fileId (Appwrite storage ID)
  const filesToUpdate = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.FILES,
    [
      Query.equal('userId', userId),
      Query.equal('fileId', fileId),
      Query.limit(1)
    ]
  );

  if (filesToUpdate.documents.length === 0) {
    throw new Error(`File not found with ID: ${fileId}. Use list_unprocessed_files to see available files.`);
  }

  // Update file with transaction link and mark as completed
  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.FILES,
    filesToUpdate.documents[0].$id,
    {
      transactionId,
      fileType,
      ocrStatus: 'completed'
    }
  );

  return {
    success: true,
    fileId,
    transactionId,
    fileType,
  };
}

/**
 * Get all files for a user
 * @param userId - The user's ID
 * @param limit - Max number of files to return (default: 100)
 * @returns Array of files
 */
export async function listFiles(
  userId: string,
  limit: number = 100
): Promise<FileRecord[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.FILES,
    [
      Query.equal('userId', userId),
      Query.limit(limit),
      Query.orderDesc('$createdAt')
    ]
  );

  return response.documents.map((f: any) => ({
    id: f.$id,
    fileId: f.fileId,
    fileName: f.fileName,
    mimeType: f.mimeType,
    fileSize: f.fileSize,
    createdAt: f.$createdAt,
    ocrStatus: f.ocrStatus,
    transactionId: f.transactionId,
    fileType: f.fileType,
  }));
}
