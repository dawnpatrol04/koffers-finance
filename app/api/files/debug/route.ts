import { NextRequest, NextResponse } from 'next/server';
import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get all files - try both with and without userId filter
    const allFilesResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.FILES,
      [Query.limit(100)]
    );

    const filesResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.FILES,
      [
        Query.equal('userId', userId),
        Query.limit(100)
      ]
    );

    console.log('Total files in database:', allFilesResponse.documents.length);
    console.log('Files for userId', userId, ':', filesResponse.documents.length);

    // Also show all files summary
    const allFilesSummary = allFilesResponse.documents.map((f: any) => ({
      fileName: f.fileName,
      userId: f.userId,
      ocrStatus: f.ocrStatus,
      transactionId: f.transactionId,
      hasTransactionId: !!f.transactionId,
    }));

    // Map to show key fields
    const filesSummary = filesResponse.documents.map((f: any) => ({
      fileName: f.fileName,
      fileId: f.fileId,
      ocrStatus: f.ocrStatus,
      transactionId: f.transactionId,
      hasTransactionId: !!f.transactionId,
      transactionIdType: typeof f.transactionId,
      transactionIdValue: f.transactionId === null ? 'null' : f.transactionId === undefined ? 'undefined' : f.transactionId,
    }));

    // Count by status
    const withTransaction = filesSummary.filter(f => f.hasTransactionId).length;
    const withoutTransaction = filesSummary.filter(f => !f.hasTransactionId).length;
    const byOcrStatus = {
      pending: filesSummary.filter(f => f.ocrStatus === 'pending').length,
      completed: filesSummary.filter(f => f.ocrStatus === 'completed').length,
      failed: filesSummary.filter(f => f.ocrStatus === 'failed').length,
      null: filesSummary.filter(f => !f.ocrStatus).length,
    };

    return NextResponse.json({
      requestedUserId: userId,
      totalInDatabase: allFilesResponse.documents.length,
      allFiles: allFilesSummary,
      filesForRequestedUser: filesResponse.documents.length,
      total: filesResponse.documents.length,
      withTransaction,
      withoutTransaction,
      byOcrStatus,
      files: filesSummary,
    });

  } catch (error: any) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: error.message || 'Debug failed' },
      { status: 500 }
    );
  }
}
