import { NextRequest, NextResponse } from "next/server";
import { databases } from "@/lib/appwrite-server";
import { ID } from "node-appwrite";
import { cookies } from "next/headers";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const TRANSACTIONS_COLLECTION_ID = "plaid_transactions";

export async function POST(request: NextRequest) {
  try {
    // Get user session from cookies
    const cookieStore = await cookies();
    const session = cookieStore.get("session");

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse session to get userId (this is a simplified example)
    // In production, you'd verify the session with Appwrite
    const sessionData = JSON.parse(session.value);
    const userId = sessionData.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, amount, date, accountId } = body;

    // Validate required fields
    if (!name || amount === undefined || !date || !accountId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate a unique transaction ID
    const transactionId = `manual_${ID.unique()}`;

    // Create transaction document in Appwrite
    const transaction = await databases.createDocument(
      DATABASE_ID,
      TRANSACTIONS_COLLECTION_ID,
      ID.unique(),
      {
        userId,
        accountId,
        transactionId,
        date,
        name,
        merchantName: name, // Use name as merchant name for manual transactions
        amount: parseFloat(amount),
        isoCurrencyCode: "USD", // Default to USD for now
        paymentChannel: "manual", // Mark as manual entry
        category: JSON.stringify(["Uncategorized"]),
        pending: false,
        accountName: "", // Will be filled from account data if available
      }
    );

    return NextResponse.json({
      success: true,
      transaction: {
        $id: transaction.$id,
        transaction_id: transaction.transactionId,
        account_id: transaction.accountId,
        amount: transaction.amount,
        date: transaction.date,
        name: transaction.name,
        merchant_name: transaction.merchantName,
        payment_channel: transaction.paymentChannel,
        category: JSON.parse(transaction.category),
        pending: transaction.pending,
      },
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}
