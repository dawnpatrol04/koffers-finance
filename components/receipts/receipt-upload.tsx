"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { X, Upload, FileText, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  isUploading: boolean;
  fileId?: string;
}

interface ReceiptUploadProps {
  transactionId?: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
  className?: string;
}

export function ReceiptUpload({
  transactionId,
  onUploadComplete,
  className,
}: ReceiptUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const handleDelete = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const onDrop = async (acceptedFiles: File[]) => {
    // Add files to state with uploading status
    const newFiles = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).slice(2),
      name: file.name,
      size: file.size,
      type: file.type,
      isUploading: true,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    // Upload files one by one
    const uploadedFiles: UploadedFile[] = [];

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const tempId = newFiles[i].id;

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const data = await response.json();

        // Update file status to uploaded
        setFiles((prev) =>
          prev.map((f) =>
            f.id === tempId
              ? { ...f, isUploading: false, fileId: data.file.$id }
              : f
          )
        );

        uploadedFiles.push({
          ...newFiles[i],
          isUploading: false,
          fileId: data.file.$id,
        });

        console.log(`Receipt uploaded: ${file.name}`);
      } catch (error) {
        console.error("Upload error:", error);
        setFiles((prev) => prev.filter((f) => f.id !== tempId));
        alert(`Failed to upload ${file.name}`);
      }
    }

    onUploadComplete?.(uploadedFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: ([reject]) => {
      if (reject?.errors.find(({ code }) => code === "file-too-large")) {
        alert("File too large. Maximum file size is 20MB");
      }

      if (reject?.errors.find(({ code }) => code === "file-invalid-type")) {
        alert("Invalid file type. Only images and PDFs are supported");
      }
    },
    maxSize: 20 * 1024 * 1024, // 20MB
    accept: {
      "image/*": [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".heic",
        ".heif",
        ".avif",
        ".tiff",
        ".bmp",
      ],
      "application/pdf": [".pdf"],
    },
  });

  return (
    <div className={className}>
      <div
        className={cn(
          "w-full h-[120px] border-2 border-dashed border-border rounded-lg",
          "flex flex-col items-center justify-center space-y-2",
          "transition-colors cursor-pointer",
          "hover:bg-muted/50",
          isDragActive && "bg-muted border-primary"
        )}
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        <Upload className="w-8 h-8 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-sm text-primary font-medium">
            Drop your receipt here
          </p>
        ) : (
          <div className="text-center px-4">
            <p className="text-sm text-foreground">
              Drop receipts here or{" "}
              <span className="text-primary underline underline-offset-2">
                click to browse
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports images and PDFs up to 20MB
            </p>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 border border-border rounded-lg bg-background"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                  {file.type.startsWith("image/") ? (
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(0)} KB
                    {file.isUploading && " • Uploading..."}
                    {!file.isUploading && " • Uploaded"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(file.id)}
                disabled={file.isUploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
