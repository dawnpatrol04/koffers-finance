export type FileType = "receipt" | "bank-statement" | "tax-document" | "other"

export type ReceiptMatchStatus = "matched" | "pending" | "unmatched"

export interface ReceiptData {
  merchant?: string
  date?: string
  total?: number
  location?: string
  latitude?: number
  longitude?: number
  items?: Array<{
    name: string
    quantity: number
    price: number
  }>
}

export interface FileDocument {
  id: string
  name: string
  type: FileType
  size: number
  uploadedAt: string
  url?: string
  thumbnailUrl?: string

  // Receipt-specific fields
  isReceipt: boolean
  receiptData?: ReceiptData
  matchStatus?: ReceiptMatchStatus
  transactionId?: string

  // Other document fields
  title?: string
  description?: string
  tags?: string[]
}
