"use client"

import { useState } from "react"
import { Upload, LayoutGrid, List, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FileCard } from "@/components/file-card"
import { FileList } from "@/components/file-list"
import type { FileDocument } from "@/types/file"
import Link from "next/link"
import { useUser } from "@/contexts/user-context"
import { useEffect, useCallback } from "react"

export default function FilesPage() {
  const { user } = useUser()
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState<FileDocument[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFiles = useCallback(async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/files?userId=${user.$id}`)
      if (response.ok) {
        const data = await response.json()

        // Map API files to FileDocument type
        const mappedFiles: FileDocument[] = (data.files || []).map((file: any) => {
          // Generate preview URL for images using Appwrite's preview API
          const isImage = file.mimeType?.includes('image')
          const thumbnailUrl = isImage
            ? `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${process.env.NEXT_PUBLIC_APPWRITE_BUCKET_FILES}/files/${file.fileId}/preview?width=400&height=300&output=jpg`
            : undefined

          return {
            id: file.$id || file.fileId,
            name: file.fileName,
            type: isImage ? 'receipt' : 'document',
            size: file.fileSize,
            uploadedAt: new Date(file.createdAt).toLocaleDateString('en-US'),
            isReceipt: isImage,
            // For now, no receipt data since OCR isn't implemented
            matchStatus: undefined,
            thumbnailUrl,
          }
        })

        setFiles(mappedFiles)
      }
    } catch (error) {
      console.error("Failed to fetch files:", error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchFiles()
    }
  }, [user, fetchFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)

    if (!user) {
      alert("Please log in to upload files.")
      return
    }

    setUploading(true)

    try {
      for (const file of droppedFiles) {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch(`/api/files/upload?userId=${user.$id}`, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          console.error("Upload failed:", error)
          continue
        }

        const result = await response.json()
        console.log("File uploaded:", result)
      }

      await fetchFiles()
    } catch (error) {
      console.error("Upload error:", error)
    } finally {
      setUploading(false)
    }
  }, [user, fetchFiles])

  const handleFileSelect = useCallback(async () => {
    if (!user) {
      alert("Please log in to upload files.")
      return
    }

    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement
      const selectedFiles = target.files ? Array.from(target.files) : []

      if (selectedFiles.length === 0) return

      setUploading(true)

      try {
        for (const file of selectedFiles) {
          const formData = new FormData()
          formData.append("file", file)

          const response = await fetch(`/api/files/upload?userId=${user.$id}`, {
            method: "POST",
            body: formData,
          })

          if (!response.ok) {
            const error = await response.json()
            console.error("Upload failed:", error)
            continue
          }

          const result = await response.json()
          console.log("File uploaded:", result)
        }

        await fetchFiles()
      } catch (error) {
        console.error("Upload error:", error)
      } finally {
        setUploading(false)
      }
    }
    input.click()
  }, [user, fetchFiles])

  const handleDeleteFile = async (fileId: string) => {
    if (!user) return
    if (!confirm("Are you sure you want to delete this file?")) {
      return
    }

    try {
      const response = await fetch(`/api/files/${fileId}?userId=${user.$id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Delete failed")
      }

      await fetchFiles()
    } catch (error) {
      console.error("Delete error:", error)
      alert("Delete failed. Please try again.")
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Files</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")}>
            <List className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "grid" ? "default" : "outline"} size="icon" onClick={() => setViewMode("grid")}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-12 mb-8 text-center hover:border-muted-foreground/50 transition-colors"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-muted">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1">Drag and drop files here</h3>
            <p className="text-sm text-muted-foreground mb-4">or click the button below to select files</p>
            <Button onClick={handleFileSelect} disabled={uploading}>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Uploading..." : "Select Files"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Maximum file size: 20MB per file</p>
        </div>
      </div>

      {/* Files Display */}
      <div className="mb-4">
        <h2 className="text-xl font-bold">Your Files</h2>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Loading files...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No files uploaded yet</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {files.map((file) => (
            <FileCard key={file.id} file={file} onClick={(file) => console.log("Clicked file:", file)} />
          ))}
        </div>
      ) : (
        <FileList
          files={files}
          onFileClick={(file) => console.log("Clicked file:", file)}
          onDelete={handleDeleteFile}
        />
      )}
    </div>
  )
}
