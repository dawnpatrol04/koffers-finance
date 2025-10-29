import { NextRequest, NextResponse } from "next/server";
import { databases } from "@/lib/appwrite-server";
import { Query } from "node-appwrite";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const TRANSACTIONS_COLLECTION_ID = "plaid_transactions";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transactionId = params.id;

    if (!transactionId) {
      return NextResponse.json(
        { error: "Transaction ID is required" },
        { status: 400 }
      );
    }

    // Fetch the transaction from Appwrite
    const response = await databases.listDocuments(
      DATABASE_ID,
      TRANSACTIONS_COLLECTION_ID,
      [Query.equal("transaction_id", transactionId), Query.limit(1)]
    );

    if (response.documents.length === 0) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    const transaction = response.documents[0];

    return NextResponse.json({
      transaction: {
        $id: transaction.$id,
        transaction_id: transaction.transaction_id,
        account_id: transaction.account_id,
        account_name: transaction.account_name,
        amount: transaction.amount,
        iso_currency_code: transaction.iso_currency_code,
        date: transaction.date,
        name: transaction.name,
        merchant_name: transaction.merchant_name,
        payment_channel: transaction.payment_channel,
        category: transaction.category,
        pending: transaction.pending,
        $createdAt: transaction.$createdAt,
        $updatedAt: transaction.$updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching transaction:", error);
    return NextResponse.json(
      { error: "Failed to fetch transaction" },
      { status: 500 }
    );
  }
}
