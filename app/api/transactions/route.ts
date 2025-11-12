import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/appwrite-server";
import { databases } from "@/lib/appwrite-server";
import { DATABASE_ID } from "@/lib/config";
import { ID } from "node-appwrite";

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user session
    const { account } = await createSessionClient();
    const user = await account.get();
    const userId = user.$id;

    // Parse request body
    const body = await req.json();
    const { name, amount, date, accountId } = body;

    // Validate required fields
    if (!name || !amount || !date || !accountId) {
      return NextResponse.json(
        { error: "Missing required fields: name, amount, date, accountId" },
        { status: 400 }
      );
    }

    // Validate amount is a number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      return NextResponse.json(
        { error: "Amount must be a valid number" },
        { status: 400 }
      );
    }

    // Create manual transaction in Appwrite
    // Store as a custom transaction (not from Plaid) with special plaidTransactionId format
    const transactionData = {
      userId: userId,
      plaidTransactionId: `manual_${ID.unique()}`, // Mark as manual with unique ID
      plaidAccountId: accountId,
      rawData: JSON.stringify({
        transaction_id: `manual_${ID.unique()}`,
        account_id: accountId,
        amount: parsedAmount,
        date: date,
        name: name,
        merchant_name: name,
        category: ["Manual Entry"],
        payment_channel: "other",
        pending: false,
        authorized_date: date,
        iso_currency_code: "USD",
        transaction_type: "manual",
        // Flag to identify manual transactions
        manual_entry: true,
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const transaction = await databases.createDocument(
      DATABASE_ID,
      "plaidTransactions",
      ID.unique(),
      transactionData
    );

    return NextResponse.json({
      success: true,
      transaction,
    });
  } catch (error: any) {
    console.error("Error creating manual transaction:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create transaction" },
      { status: 500 }
    );
  }
}
