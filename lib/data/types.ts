/**
 * Shared TypeScript types for business logic layer
 * Used by both Chat AI tools and MCP server
 */

export interface Account {
  id: string;
  name: string;
  type: string;
  subtype?: string;
  currentBalance: number;
  availableBalance?: number;
  currency: string;
  mask?: string;
  institutionName?: string;
  plaidAccountId?: string;
}

export interface Transaction {
  id: string;
  plaidTransactionId?: string;
  accountId: string;
  accountName?: string;
  date: string;
  name: string;
  merchantName?: string;
  amount: number;
  currency: string;
  category: string | string[];
  pending: boolean;
  paymentChannel?: string;
}

export interface TransactionSearchParams {
  amount?: number;
  dateFrom?: string;
  dateTo?: string;
  merchant?: string;
  accountId?: string;
  category?: string;
  limit?: number;
}

export interface TransactionSearchResult extends Transaction {
  hasReceipt?: boolean;
}

export interface SpendingSummary {
  period: {
    startDate: string;
    endDate: string;
  };
  totalSpending: number;
  categories: CategorySpending[];
}

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: string;
}
