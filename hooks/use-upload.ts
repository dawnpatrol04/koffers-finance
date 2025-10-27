"use client";

import { useState } from "react";
import { storage } from "@/lib/appwrite-client";
import { ID } from "appwrite";

interface UploadParams {
  file: File;
  path: string[];
  bucket: string;
}

interface UploadResult {
  url: string;
  path: string[];
}

export function useUpload() {
  const [isLoading, setLoading] = useState<boolean>(false);

  const uploadFile = async ({
    file,
    path,
    bucket,
  }: UploadParams): Promise<UploadResult> => {
    setLoading(true);

    try {
      // Upload file to Appwrite Storage
      const fileId = ID.unique();
      const uploadedFile = await storage.createFile(bucket, fileId, file);

      // Get file URL
      const fileUrl = storage.getFileView(bucket, uploadedFile.$id);

      return {
        url: fileUrl.toString(),
        path: [...path, uploadedFile.$id],
      };
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    uploadFile,
    isLoading,
  };
}
