import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-server';

// Merchant categorization cache
// Maps normalized merchant name → category
const merchantCache = new Map<string, {
  category: string;
  count: number;  // Number of times this merchant has been categorized
  lastUsed: number;  // Timestamp of last use
  confidence: number;  // Confidence score (increases with usage)
}>();

// Cache statistics
let cacheHits = 0;
let cacheMisses = 0;

// Normalize merchant name for cache lookup
function normalizeMerchant(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

// Get category from cache
function getCachedCategory(merchantName: string): string | null {
  const normalized = normalizeMerchant(merchantName);
  const cached = merchantCache.get(normalized);

  if (cached && cached.confidence >= 0.8) { // Only use high-confidence cached entries
    cacheHits++;
    cached.lastUsed = Date.now();
    cached.count++;
    console.log(`✅ Cache HIT for "${merchantName}" → ${cached.category} (confidence: ${cached.confidence.toFixed(2)})`);
    return cached.category;
  }

  cacheMisses++;
  return null;
}

// Update cache with new categorization
function updateCache(merchantName: string, category: string): void {
  const normalized = normalizeMerchant(merchantName);
  const existing = merchantCache.get(normalized);

  if (existing) {
    // Increase confidence with repeated categorizations
    existing.count++;
    existing.confidence = Math.min(1.0, existing.confidence + 0.1);
    existing.lastUsed = Date.now();

    // If new category is different, reduce confidence
    if (existing.category !== category) {
      existing.confidence = 0.5;
      existing.category = category;
      console.log(`⚠️  Merchant "${merchantName}" category changed to ${category}`);
    }
  } else {
    // New merchant entry
    merchantCache.set(normalized, {
      category,
      count: 1,
      lastUsed: Date.now(),
      confidence: 0.6 // Start with moderate confidence
    });
    console.log(`📝 Cached new merchant: "${merchantName}" → ${category}`);
  }
}

// Get cache statistics
function getCacheStats() {
  const total = cacheHits + cacheMisses;
  const hitRate = total > 0 ? (cacheHits / total * 100).toFixed(1) : '0.0';

  return {
    size: merchantCache.size,
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: `${hitRate}%`,
    totalRequests: total
  };
}

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

// GET endpoint for cache statistics
export async function GET() {
  const stats = getCacheStats();

  // Get top 10 merchants by usage
  const topMerchants = Array.from(merchantCache.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([merchant, data]) => ({
      merchant,
      category: data.category,
      count: data.count,
      confidence: data.confidence
    }));

  return NextResponse.json({
    ...stats,
    topMerchants
  });
}

// PATCH endpoint for manual category override
export async function PATCH(request: NextRequest) {
  try {
    const { transactionId, category } = await request.json();

    if (!transactionId || !category) {
      return NextResponse.json(
        { error: 'transactionId and category required' },
        { status: 400 }
      );
    }

    // Validate category
    if (!CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Get transaction
    const transaction = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.PLAID_TRANSACTIONS,
      transactionId
    );

    const merchantName = transaction.merchantName || transaction.name;
    const oldCategory = typeof transaction.category === 'string'
      ? JSON.parse(transaction.category)[0]
      : transaction.category?.[0] || 'Uncategorized';

    // Update cache with user's override (high confidence boost)
    // User corrections should have higher confidence than AI suggestions
    const normalized = normalizeMerchant(merchantName);
    const cached = merchantCache.get(normalized);

    if (cached) {
      cached.category = category;
      cached.confidence = Math.min(1.0, cached.confidence + 0.3); // Big confidence boost for user correction
      cached.lastUsed = Date.now();
      cached.count++;
    } else {
      merchantCache.set(normalized, {
        category,
        count: 1,
        lastUsed: Date.now(),
        confidence: 0.9 // Start with high confidence for user corrections
      });
    }

    // Update transaction
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PLAID_TRANSACTIONS,
      transactionId,
      {
        category: JSON.stringify([category]),
        aiCategorized: true,
        manuallyOverridden: true,
        aiCategorizedAt: new Date().toISOString()
      }
    );

    console.log(`✏️  User overrode "${merchantName}": ${oldCategory} → ${category} (learning applied)`);

    return NextResponse.json({
      success: true,
      transactionId,
      oldCategory,
      newCategory: category,
      message: 'Category updated and cached for future transactions'
    });

  } catch (error: any) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update category' },
      { status: 500 }
    );
  }
}

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

    // Check cache first
    const cachedCategory = getCachedCategory(transactionDetails.merchantName);
    if (cachedCategory) {
      // Update transaction with cached category
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PLAID_TRANSACTIONS,
        transactionId,
        {
          category: JSON.stringify([cachedCategory]),
          aiCategorized: true,
          aiCategorizedAt: new Date().toISOString()
        }
      );

      return NextResponse.json({
        success: true,
        transactionId,
        category: cachedCategory,
        confidence: 'high',
        cached: true
      });
    }

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

    // Update cache with new categorization
    updateCache(transactionDetails.merchantName, cleanedCategory);

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
      confidence: 'high',
      cached: false
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

          // Check cache first
          const cachedCategory = getCachedCategory(transactionDetails.merchantName);
          if (cachedCategory) {
            // Update transaction with cached category
            await databases.updateDocument(
              DATABASE_ID,
              COLLECTIONS.PLAID_TRANSACTIONS,
              transactionId,
              {
                category: JSON.stringify([cachedCategory]),
                aiCategorized: true,
                aiCategorizedAt: new Date().toISOString()
              }
            );

            successCount++;
            return {
              transactionId,
              category: cachedCategory,
              success: true,
              cached: true
            };
          }

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

          // Update cache
          updateCache(transactionDetails.merchantName, finalCategory);

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
            success: true,
            cached: false
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
