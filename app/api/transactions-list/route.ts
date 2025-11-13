import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/appwrite-server";
import { DATABASE_ID } from "@/lib/appwrite-config";
import { Query } from "node-appwrite";

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user session
    const { account, databases } = await createSessionClient();
    const user = await account.get();
    const userId = user.$id;

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const search = searchParams.get("search") || "";

    // Build Appwrite queries - MUST filter by userId for security
    const queries = [
      Query.equal("userId", userId),
      Query.limit(limit),
      Query.offset(offset),
      Query.orderDesc("$createdAt"),
    ];

    // Add search if provided
    if (search) {
      queries.push(Query.search("merchantName", search));
    }

    // Query transactions for current user only
    const response = await databases.listDocuments(
      DATABASE_ID,
      "plaidTransactions",
      queries
    );

    // Get transaction IDs to query for files
    const txnIds = response.documents.map((t: any) => t.$id);

    // Query files collection to check which transactions have receipts
    let filesMap = new Map<string, boolean>();
    if (txnIds.length > 0) {
      try {
        const filesResponse = await databases.listDocuments(
          DATABASE_ID,
          "files",
          [Query.equal("userId", userId), Query.limit(1000)]
        );
        // Create map of transactionId -> has files
        filesResponse.documents.forEach((file: any) => {
          if (file.transactionId) {
            filesMap.set(file.transactionId, true);
          }
        });
      } catch (err) {
        console.error("Error fetching files:", err);
      }
    }

    // Query receiptItems collection to get line items for transactions
    let receiptItemsMap = new Map<string, any[]>();
    if (txnIds.length > 0) {
      try {
        const itemsResponse = await databases.listDocuments(
          DATABASE_ID,
          "receiptItems",
          [Query.equal("userId", userId), Query.limit(1000)]
        );
        // Group items by transactionId
        itemsResponse.documents.forEach((item: any) => {
          if (item.transactionId) {
            if (!receiptItemsMap.has(item.transactionId)) {
              receiptItemsMap.set(item.transactionId, []);
            }
            receiptItemsMap.get(item.transactionId)?.push({
              id: item.$id,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              totalPrice: item.totalPrice,
              category: item.category,
              tags: item.tags || [],
            });
          }
        });
      } catch (err) {
        console.error("Error fetching receipt items:", err);
      }
    }

    // Map documents and attach file/receipt info
    const transactions = response.documents.map((t: any) => ({
      ...t,
      hasReceipt: filesMap.has(t.$id),
      receiptItems: receiptItemsMap.get(t.$id) || undefined,
    }));

    return NextResponse.json({
      documents: transactions,
      total: response.total,
    });
  } catch (error: any) {
    console.error("Error fetching transactions:", error);

    // Check if it's an authentication error
    if (error.message === "No session") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
