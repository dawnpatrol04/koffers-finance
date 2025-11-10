import { NextRequest, NextResponse } from "next/server";
import { databases, DATABASE_ID, COLLECTIONS } from "@/lib/appwrite-server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('[Transaction API] Fetching transaction with ID:', id);

    if (!id) {
      return NextResponse.json(
        { error: "Transaction ID is required" },
        { status: 400 }
      );
    }

    // Fetch the transaction from Appwrite by document ID
    console.log('[Transaction API] Database ID:', DATABASE_ID);
    console.log('[Transaction API] Collection ID:', COLLECTIONS.PLAID_TRANSACTIONS);

    const transaction = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.PLAID_TRANSACTIONS,
      id
    );

    console.log('[Transaction API] Successfully fetched transaction');

    // Parse the rawData field to get transaction details
    const txnData = JSON.parse(transaction.rawData);

    return NextResponse.json({
      transaction: {
        $id: transaction.$id,
        transaction_id: transaction.plaidTransactionId,
        account_id: transaction.plaidAccountId,
        account_name: txnData.account_owner || '',
        amount: txnData.amount,
        iso_currency_code: txnData.iso_currency_code || 'USD',
        date: txnData.date || txnData.authorized_date,
        name: txnData.name,
        merchant_name: txnData.merchant_name || txnData.name,
        payment_channel: txnData.payment_channel || 'other',
        category: txnData.category || [],
        pending: txnData.pending || false,
        $createdAt: transaction.$createdAt,
        $updatedAt: transaction.$updatedAt,
      },
    });
  } catch (error: any) {
    console.error('[Transaction API] Error fetching transaction:', error);
    console.error('[Transaction API] Error type:', error.constructor.name);
    console.error('[Transaction API] Error code:', error.code);
    console.error('[Transaction API] Error message:', error.message);

    return NextResponse.json(
      {
        error: "Failed to fetch transaction",
        details: error.message,
        code: error.code
      },
      { status: 500 }
    );
  }
}
