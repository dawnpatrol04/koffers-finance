import { NextRequest, NextResponse } from 'next/server';
import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';

/**
 * Get sync job status
 * Returns the status of background transaction sync jobs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const jobId = searchParams.get('jobId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get most recent sync job for this user
    const queries = [Query.equal('userId', userId)];

    if (jobId) {
      queries.push(Query.equal('$id', jobId));
    }

    queries.push(Query.orderDesc('$createdAt'));
    queries.push(Query.limit(1));

    const jobsResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.SYNC_JOBS,
      queries
    );

    if (jobsResponse.documents.length === 0) {
      return NextResponse.json({
        status: 'idle',
        message: 'No sync jobs found'
      });
    }

    const job = jobsResponse.documents[0];

    return NextResponse.json({
      jobId: job.$id,
      status: job.status,
      progress: job.progress,
      totalItems: job.totalItems,
      processedItems: job.processedItems,
      startedAt: job.$createdAt,
      completedAt: job.completedAt,
      error: job.error,
      results: job.results
    });

  } catch (error: any) {
    console.error('Error fetching sync status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sync status' },
      { status: 500 }
    );
  }
}
