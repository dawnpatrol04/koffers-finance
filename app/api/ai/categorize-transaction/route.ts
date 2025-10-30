import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-server';

// Standard category taxonomy for financial transactions
const CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Shopping',
  'Entertainment',
  'Transportation',
  'Bills & Utilities',
  'Healthcare',
  'Travel',
  'Personal Care',
  'Education',
  'Gifts & Donations',
  'Business Services',
  'Home & Garden',
  'Fitness & Sports',
  'Insurance',
  'Taxes',
  'Income',
  'Investments',
  'Transfer',
  'Uncategorized'
];

const CATEGORIZATION_PROMPT = `You are a financial transaction categorization expert. Given transaction details, classify it into ONE of these categories:

${CATEGORIES.map((cat, idx) => `${idx + 1}. ${cat}`).join('\n')}

Guidelines:
- Food & Dining: Restaurants, cafes, bars, fast food
- Groceries: Supermarkets, grocery stores, food markets
- Shopping: Retail stores, online shopping, clothing, electronics
- Entertainment: Movies, concerts, streaming services, games
- Transportation: Gas, public transit, rideshare, parking
- Bills & Utilities: Electricity, water, internet, phone
- Healthcare: Doctor visits, pharmacy, medical supplies
- Travel: Hotels, flights, vacation expenses
- Personal Care: Salon, spa, beauty products
- Education: Tuition, books, courses, training
- Gifts & Donations: Charitable giving, presents
- Business Services: Professional fees, software, consulting
- Home & Garden: Furniture, home improvement, lawn care
- Fitness & Sports: Gym, sports equipment, athletic activities
- Insurance: Health, auto, home, life insurance
- Taxes: Tax payments, IRS
- Income: Salary, wages, freelance income
- Investments: Stock purchases, retirement contributions
- Transfer: Money moved between accounts
- Uncategorized: Use only if truly unclear

Respond with ONLY the category name, nothing else.`;

export async function POST(request: NextRequest) {
  try {
    const { transactionId, transactionIds } = await request.json();

    // Handle batch categorization
    if (transactionIds && Array.isArray(transactionIds)) {
      return await batchCategorize(transactionIds);
    }

    // Handle single transaction categorization
    if (!transactionId) {
      return NextResponse.json(
        { error: 'transactionId or transactionIds required' },
        { status: 400 }
      );
    }

    // Get transaction from database
    const transaction = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.PLAID_TRANSACTIONS,
      transactionId
    );

    // Prepare transaction details for AI
    const transactionDetails = {
      name: transaction.name,
      merchantName: transaction.merchantName || transaction.name,
      amount: transaction.amount,
      date: transaction.date,
      currentCategory: typeof transaction.category === 'string'
        ? JSON.parse(transaction.category)
        : transaction.category
    };

    // Call Claude for categorization
    const { text: category } = await generateText({
      model: anthropic('claude-3-5-haiku-20241022'), // Fast and cheap for categorization
      prompt: `${CATEGORIZATION_PROMPT}

Transaction to categorize:
- Merchant: ${transactionDetails.merchantName}
- Description: ${transactionDetails.name}
- Amount: $${Math.abs(transactionDetails.amount)}
- Date: ${transactionDetails.date}
- Current Plaid category: ${JSON.stringify(transactionDetails.currentCategory)}

Category:`,
      maxTokens: 20,
      temperature: 0.3, // Low temperature for consistent categorization
    });

    const cleanedCategory = category.trim();

    // Validate that the response is one of our categories
    if (!CATEGORIES.includes(cleanedCategory)) {
      console.warn(`Invalid category returned: ${cleanedCategory}, defaulting to Uncategorized`);
      const finalCategory = 'Uncategorized';

      // Update transaction with new category
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PLAID_TRANSACTIONS,
        transactionId,
        {
          category: JSON.stringify([finalCategory]),
          aiCategorized: true,
          aiCategorizedAt: new Date().toISOString()
        }
      );

      return NextResponse.json({
        success: true,
        transactionId,
        category: finalCategory,
        confidence: 'low'
      });
    }

    // Update transaction with new category
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PLAID_TRANSACTIONS,
      transactionId,
      {
        category: JSON.stringify([cleanedCategory]),
        aiCategorized: true,
        aiCategorizedAt: new Date().toISOString()
      }
    );

    console.log(`✨ Categorized transaction ${transactionId} as: ${cleanedCategory}`);

    return NextResponse.json({
      success: true,
      transactionId,
      category: cleanedCategory,
      confidence: 'high'
    });

  } catch (error: any) {
    console.error('Error categorizing transaction:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to categorize transaction' },
      { status: 500 }
    );
  }
}

async function batchCategorize(transactionIds: string[]) {
  try {
    console.log(`🔄 Batch categorizing ${transactionIds.length} transactions`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process in batches of 10 to avoid overwhelming the API
    const BATCH_SIZE = 10;
    for (let i = 0; i < transactionIds.length; i += BATCH_SIZE) {
      const batch = transactionIds.slice(i, i + BATCH_SIZE);

      // Process batch in parallel
      const batchPromises = batch.map(async (transactionId) => {
        try {
          // Get transaction
          const transaction = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.PLAID_TRANSACTIONS,
            transactionId
          );

          // Skip if already AI categorized recently (within 7 days)
          if (transaction.aiCategorized && transaction.aiCategorizedAt) {
            const categorizedDate = new Date(transaction.aiCategorizedAt);
            const daysSince = (Date.now() - categorizedDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSince < 7) {
              return {
                transactionId,
                skipped: true,
                reason: 'recently_categorized'
              };
            }
          }

          // Prepare transaction details
          const transactionDetails = {
            name: transaction.name,
            merchantName: transaction.merchantName || transaction.name,
            amount: transaction.amount,
            date: transaction.date
          };

          // Call Claude for categorization
          const { text: category } = await generateText({
            model: anthropic('claude-3-5-haiku-20241022'),
            prompt: `${CATEGORIZATION_PROMPT}

Transaction to categorize:
- Merchant: ${transactionDetails.merchantName}
- Description: ${transactionDetails.name}
- Amount: $${Math.abs(transactionDetails.amount)}
- Date: ${transactionDetails.date}

Category:`,
            maxTokens: 20,
            temperature: 0.3,
          });

          const cleanedCategory = category.trim();
          const finalCategory = CATEGORIES.includes(cleanedCategory)
            ? cleanedCategory
            : 'Uncategorized';

          // Update transaction
          await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.PLAID_TRANSACTIONS,
            transactionId,
            {
              category: JSON.stringify([finalCategory]),
              aiCategorized: true,
              aiCategorizedAt: new Date().toISOString()
            }
          );

          successCount++;
          return {
            transactionId,
            category: finalCategory,
            success: true
          };

        } catch (error: any) {
          errorCount++;
          console.error(`Error categorizing transaction ${transactionId}:`, error.message);
          return {
            transactionId,
            error: error.message,
            success: false
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < transactionIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ Batch categorization complete: ${successCount} success, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      totalProcessed: transactionIds.length,
      successCount,
      errorCount,
      results
    });

  } catch (error: any) {
    console.error('Error in batch categorization:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to batch categorize' },
      { status: 500 }
    );
  }
}
