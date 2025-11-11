import { NextRequest, NextResponse } from 'next/server';
import { storage, databases, ID, DATABASE_ID, COLLECTIONS, STORAGE_BUCKETS } from '@/lib/appwrite-server';
import { InputFile } from 'node-appwrite/file';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import heicConvert from 'heic-convert';
import { validateSession } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    // Validate session and get userId securely
    const { userId } = await validateSession();

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file size (20MB limit)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 20MB' }, { status: 400 });
    }

    // Convert file to buffer
    let buffer = Buffer.from(await file.arrayBuffer());

    // Detect actual file type from magic numbers (not extension)
    const detectedType = await fileTypeFromBuffer(buffer);
    let finalMimeType = file.type || detectedType?.mime || 'application/octet-stream';
    let finalFileName = file.name;
    let finalBuffer = buffer;

    // Handle HEIC conversion to JPEG
    if (detectedType?.mime === 'image/heic' || detectedType?.mime === 'image/heif') {
      console.log('Converting HEIC to JPEG...');

      // Convert HEIC to JPEG using heic-convert (pure JS, works on Vercel)
      const outputBuffer = await heicConvert({
        buffer: buffer,
        format: 'JPEG',
        quality: 0.9
      });

      finalBuffer = Buffer.from(outputBuffer);

      // Update metadata
      finalMimeType = 'image/jpeg';
      finalFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');

      console.log(`Converted ${file.name} (${buffer.length} bytes) to ${finalFileName} (${finalBuffer.length} bytes)`);
    }

    // For other images, ensure they're in supported format
    else if (detectedType?.mime?.startsWith('image/') &&
             !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(detectedType.mime)) {
      console.log(`Converting ${detectedType.mime} to JPEG...`);

      finalBuffer = await sharp(buffer)
        .jpeg({ quality: 90 })
        .toBuffer();

      finalMimeType = 'image/jpeg';
      finalFileName = file.name.replace(/\.[^.]+$/, '.jpg');
    }

    // Upload to Appwrite Storage
    const uploadedFile = await storage.createFile(
      STORAGE_BUCKETS.FILES,
      ID.unique(),
      InputFile.fromBuffer(finalBuffer, finalFileName),
      [`read("user:${userId}")`, `delete("user:${userId}")`]
    );

    // Store file metadata in database
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
        fileType: 'receipt', // Default type for uploaded files
        ocrStatus: 'pending',
        createdAt: new Date().toISOString(),
      }
    );

    // TODO: Trigger Claude Vision OCR processing (async)
    // This would be done in a separate API endpoint or background job

    return NextResponse.json({
      success: true,
      file: uploadedFile,
      metadata: fileDoc,
    });
  } catch (error: any) {
    // Handle authentication errors
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('File upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
