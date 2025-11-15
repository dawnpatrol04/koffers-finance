import { NextRequest, NextResponse } from 'next/server';
import { STORAGE_BUCKETS } from '@/lib/appwrite-config';
import { createAdminClient } from '@/lib/appwrite-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { storage } = await createAdminClient();
    const { fileId } = params;

    if (!fileId) {
      return NextResponse.json(
        { error: 'fileId is required' },
        { status: 400 }
      );
    }

    // Get file view directly from Appwrite using server SDK
    // This returns the actual file as a Buffer
    const file = await storage.getFileView(
      STORAGE_BUCKETS.FILES,
      fileId
    );

    // Return the image with appropriate headers
    return new NextResponse(file, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error: any) {
    console.error('Error fetching file preview:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch file preview' },
      { status: 500 }
    );
  }
}
