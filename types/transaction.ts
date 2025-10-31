export interface Transaction {
  id: string
  date: string
  merchant: string
  merchantSubtext?: string
  amount: number
  category: string
  channel: string
  status: "pending" | "completed"

  // Completion tracking
  hasReceipt: boolean
  hasCommentary: boolean
  isReviewed: boolean
  hasTags: boolean
  hasReminder: boolean

  // Receipt OCR data
  receiptItems?: ReceiptItem[]

  // Optional data
  commentary?: string
  reviewedBy?: string
  reviewedAt?: string
  tags?: string[]
  reminder?: TransactionReminder
}

export interface ReceiptItem {
  id: string
  name: string
  quantity: number
  price: number
  category?: string
  tags?: ("business" | "personal")[]
}

export interface TransactionTag {
  id: string
  label: string
  type: "business" | "personal" | "custom"
}

export interface TransactionReminder {
  id: string
  message: string
  dueDate?: string
  completed: boolean
}
