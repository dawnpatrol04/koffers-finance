"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/ui/icons";
import { MdOutlineGridView, MdOutlineViewList, MdCloudUpload, MdOutlineAdd } from "react-icons/md";

export default function FilesPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [loading, setLoading] = useState(true);

  // Fetch files on mount
  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch("/api/files");
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error("Failed to fetch files:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    await uploadFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    await uploadFiles(selectedFiles);
  }, []);

  const uploadFiles = async (filesToUpload: File[]) => {
    setUploading(true);

    try {
      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const result = await response.json();
        console.log("File uploaded:", result);
      }

      // Refresh files list
      await fetchFiles();
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) {
      return;
    }

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      // Refresh files list
      await fetchFiles();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Delete failed. Please try again.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Files</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-2 rounded-md transition-colors",
              viewMode === "list"
                ? "bg-gray-100 dark:bg-gray-800 text-primary"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <MdOutlineViewList size={20} />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-2 rounded-md transition-colors",
              viewMode === "grid"
                ? "bg-gray-100 dark:bg-gray-800 text-primary"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <MdOutlineGridView size={20} />
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-12 text-center transition-all",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-gray-300 dark:border-gray-700",
          uploading && "opacity-50 pointer-events-none"
        )}
      >
        {uploading ? (
          <div className="space-y-2">
            <Icons.Downloading size={48} className="mx-auto text-primary animate-pulse" />
            <p className="text-sm text-gray-500">Processing files...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <MdCloudUpload size={48} className="mx-auto text-gray-400" />
            <div>
              <p className="text-lg font-medium">Drag and drop files here</p>
              <p className="text-sm text-gray-500 mt-1">
                or click the button below to select files
              </p>
            </div>
            <div>
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 cursor-pointer transition-colors"
              >
                <MdOutlineAdd size={20} />
                Select Files
              </label>
            </div>
            <p className="text-xs text-gray-400">
              Maximum file size: 20MB per file
            </p>
          </div>
        )}
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Your Files</h2>

          {viewMode === "list" ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      Size
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      Uploaded
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.$id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="px-4 py-3 text-sm">{file.fileName}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {file.mimeType}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {(file.fileSize / 1024).toFixed(1)} KB
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(file.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => handleDeleteFile(file.fileId)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {files.map((file) => (
                <div
                  key={file.$id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="aspect-square bg-gray-100 dark:bg-gray-900 rounded-md mb-2 flex items-center justify-center">
                    <Icons.Description size={48} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-medium truncate">{file.fileName}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(file.fileSize / 1024).toFixed(1)} KB
                  </p>
                  <button
                    onClick={() => handleDeleteFile(file.fileId)}
                    className="mt-2 text-xs text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {files.length === 0 && !uploading && (
        <div className="text-center py-12 text-gray-500">
          <p>No files uploaded yet</p>
        </div>
      )}
    </div>
  );
}
