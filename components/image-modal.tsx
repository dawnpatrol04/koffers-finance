"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ImageModalProps {
  imageUrl: string
  fileName: string
  onClose: () => void
}

export function ImageModal({ imageUrl, fileName, onClose }: ImageModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white z-10"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>
        <img
          src={imageUrl}
          alt={fileName}
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  )
}
