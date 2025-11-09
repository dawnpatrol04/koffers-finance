import { NextRequest, NextResponse } from 'next/server';
import { storage, STORAGE_BUCKETS } from '@/lib/appwrite-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = params;

    if (!fileId) {
      return NextResponse.json(
        { error: 'fileId is required' },
        { status: 400 }
      );
    }

    // Get file preview from Appwrite using server SDK (has API key authentication)
    const preview = storage.getFilePreview(
      STORAGE_BUCKETS.FILES,
      fileId,
      400, // width
      300, // height
      'center', // gravity
      100, // quality
      0, // border width
      '', // border color
      0, // border radius
      1, // opacity
      0, // rotation
      '#FFFFFF', // background
      'jpg' // output format
    );

    // Fetch the actual image data
    const response = await fetch(preview.toString());

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch preview' },
        { status: response.status }
      );
    }

    // Get the image as a buffer
    const imageBuffer = await response.arrayBuffer();

    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
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
