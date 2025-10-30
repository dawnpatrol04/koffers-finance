/**
 * AI Transaction Categorization Prompt
 *
 * This prompt is optimized for Claude 3.5 Sonnet to achieve >90% accuracy
 * in categorizing financial transactions based on merchant names.
 */

export interface Transaction {
  merchantName: string;
  amount: number;
  date: string;
}

export interface CategorizationResult {
  category: string;
  subcategory: string;
  confidence: number;
  reasoning?: string;
}

// System prompt explaining the categorization task
export const CATEGORIZATION_SYSTEM_PROMPT = `You are an expert financial transaction categorizer. Your job is to analyze transaction merchant names and categorize them accurately.

You must respond with ONLY a JSON object in this exact format:
{
  "category": "Main Category Name",
  "subcategory": "Specific Subcategory",
  "confidence": 0.95
}

Confidence scoring guide:
- 0.95-1.00: Exact merchant match, well-known brand
- 0.85-0.94: Clear category indicators, very likely correct
- 0.70-0.84: Good guess with context clues
- 0.50-0.69: Ambiguous, multiple possibilities
- Below 0.50: Highly uncertain, manual review recommended`;

// Few-shot examples for learning
export const FEW_SHOT_EXAMPLES = [
  {
    input: { merchantName: "McDonald's", amount: 12.5, date: "2025-10-15" },
    output: {
      category: "Food & Dining",
      subcategory: "Fast Food",
      confidence: 0.98,
    },
  },
  {
    input: { merchantName: "Starbucks", amount: 5.75, date: "2025-10-15" },
    output: {
      category: "Food & Dining",
      subcategory: "Coffee Shops",
      confidence: 0.98,
    },
  },
  {
    input: { merchantName: "Shell Gas Station", amount: 45.0, date: "2025-10-15" },
    output: {
      category: "Transportation",
      subcategory: "Gas & Fuel",
      confidence: 0.97,
    },
  },
  {
    input: { merchantName: "Amazon.com", amount: 89.99, date: "2025-10-15" },
    output: {
      category: "Shopping",
      subcategory: "Online Shopping",
      confidence: 0.96,
    },
  },
  {
    input: { merchantName: "Uber", amount: 18.5, date: "2025-10-15" },
    output: {
      category: "Transportation",
      subcategory: "Rideshare (Uber/Lyft)",
      confidence: 0.99,
    },
  },
  {
    input: { merchantName: "Netflix", amount: 15.99, date: "2025-10-15" },
    output: {
      category: "Entertainment",
      subcategory: "Streaming Services",
      confidence: 0.99,
    },
  },
  {
    input: { merchantName: "CVS Pharmacy", amount: 24.5, date: "2025-10-15" },
    output: {
      category: "Healthcare & Wellness",
      subcategory: "Pharmacy",
      confidence: 0.97,
    },
  },
  {
    input: { merchantName: "Whole Foods", amount: 127.34, date: "2025-10-15" },
    output: {
      category: "Food & Dining",
      subcategory: "Groceries",
      confidence: 0.98,
    },
  },
  {
    input: { merchantName: "PG&E", amount: 145.67, date: "2025-10-15" },
    output: {
      category: "Bills & Utilities",
      subcategory: "Electric",
      confidence: 0.95,
    },
  },
  {
    input: { merchantName: "Airbnb", amount: 250.0, date: "2025-10-15" },
    output: {
      category: "Travel & Vacation",
      subcategory: "Vacation Rentals",
      confidence: 0.98,
    },
  },
  {
    input: {
      merchantName: "ATM Withdrawal - Wells Fargo",
      amount: 100.0,
      date: "2025-10-15",
    },
    output: {
      category: "Financial",
      subcategory: "ATM Withdrawal",
      confidence: 0.99,
    },
  },
  {
    input: { merchantName: "Venmo", amount: 50.0, date: "2025-10-15" },
    output: {
      category: "Financial",
      subcategory: "Transfer",
      confidence: 0.97,
    },
  },
  {
    input: { merchantName: "Spotify", amount: 9.99, date: "2025-10-15" },
    output: {
      category: "Entertainment",
      subcategory: "Streaming Services",
      confidence: 0.99,
    },
  },
  {
    input: { merchantName: "Planet Fitness", amount: 10.0, date: "2025-10-15" },
    output: {
      category: "Healthcare & Wellness",
      subcategory: "Gym & Fitness",
      confidence: 0.97,
    },
  },
  {
    input: {
      merchantName: "ACME Corporation Payroll",
      amount: -2500.0,
      date: "2025-10-15",
    },
    output: {
      category: "Income",
      subcategory: "Paycheck",
      confidence: 0.96,
    },
  },
];

// Category definitions for the prompt
export const CATEGORY_DEFINITIONS = `
## Available Categories:

1. **Food & Dining**: Restaurants, Fast Food, Coffee Shops, Groceries, Delivery & Takeout, Bars & Nightlife
2. **Shopping**: Clothing & Accessories, Electronics & Software, Home & Garden, Sporting Goods, Hobbies & Crafts, Books & Media, Online Shopping, General Merchandise
3. **Transportation**: Gas & Fuel, Parking, Public Transit, Rideshare (Uber/Lyft), Auto Payment, Auto Insurance, Auto Maintenance & Repairs, Tolls
4. **Bills & Utilities**: Rent/Mortgage, Electric, Gas/Heating, Water, Internet, Phone/Mobile, Cable/Streaming, Trash/Recycling
5. **Entertainment**: Movies & Theater, Concerts & Events, Sports & Recreation, Streaming Services, Gaming, Memberships & Subscriptions
6. **Healthcare & Wellness**: Doctor Visits, Dentist, Pharmacy, Health Insurance, Gym & Fitness, Personal Care
7. **Travel & Vacation**: Hotels & Lodging, Flights, Vacation Rentals, Travel Insurance, Activities & Tours
8. **Financial**: Bank Fees, Credit Card Payment, Loan Payment, Investment, Transfer, ATM Withdrawal
9. **Personal & Family**: Childcare, Pet Care, Education, Gifts & Donations, Personal Services
10. **Business & Professional**: Office Supplies, Professional Services, Shipping & Postage, Legal & Accounting, Software & Tools
11. **Income**: Paycheck, Bonus, Refund, Reimbursement, Interest, Investment Return, Side Income
12. **Uncategorized**: Other (use only when truly ambiguous)

## Special Rules:

- Negative amounts (income) usually belong in "Income" category
- ATM withdrawals → Financial > ATM Withdrawal
- Transfers (Venmo, Zelle, PayPal person-to-person) → Financial > Transfer
- If merchant name is unclear, use context clues (amount, common patterns)
- Prefer more specific subcategories when confident
- Use "Uncategorized > Other" only when truly uncertain
`;

/**
 * Build the user prompt for a single transaction
 */
export function buildSingleTransactionPrompt(
  transaction: Transaction
): string {
  return `${CATEGORY_DEFINITIONS}

## Examples:
${FEW_SHOT_EXAMPLES.map(
  (example) => `
Input: ${JSON.stringify(example.input)}
Output: ${JSON.stringify(example.output)}
`
).join("\n")}

## Transaction to Categorize:
${JSON.stringify(transaction)}

Respond with ONLY the JSON object, no markdown formatting:`;
}

/**
 * Build the user prompt for batch transactions
 */
export function buildBatchTransactionPrompt(
  transactions: Transaction[]
): string {
  return `${CATEGORY_DEFINITIONS}

## Examples:
${FEW_SHOT_EXAMPLES.map(
  (example) => `
Input: ${JSON.stringify(example.input)}
Output: ${JSON.stringify(example.output)}
`
).join("\n")}

## Transactions to Categorize (${transactions.length} total):
${JSON.stringify(transactions, null, 2)}

Respond with ONLY a JSON array of categorization results in the same order, no markdown formatting:
[
  { "category": "...", "subcategory": "...", "confidence": 0.95 },
  ...
]`;
}

/**
 * Parse categorization result from Claude's response
 */
export function parseCategorizationResult(
  response: string
): CategorizationResult {
  try {
    // Try to parse as JSON directly
    let parsed = JSON.parse(response);
    return parsed;
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch =
      response.match(/```json\n([\s\S]*?)\n```/) || response.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("No valid JSON found in response");
    }

    const jsonString = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonString);
  }
}

/**
 * Parse batch categorization results from Claude's response
 */
export function parseBatchCategorizationResults(
  response: string
): CategorizationResult[] {
  try {
    // Try to parse as JSON array directly
    let parsed = JSON.parse(response);

    if (!Array.isArray(parsed)) {
      throw new Error("Expected array response");
    }

    return parsed;
  } catch {
    // Try to extract JSON array from markdown code blocks
    const jsonMatch =
      response.match(/```json\n([\s\S]*?)\n```/) ||
      response.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      throw new Error("No valid JSON array found in response");
    }

    const jsonString = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonString);

    if (!Array.isArray(parsed)) {
      throw new Error("Expected array response");
    }

    return parsed;
  }
}

/**
 * Validate categorization result
 */
export function validateCategorizationResult(
  result: any
): result is CategorizationResult {
  return (
    typeof result === "object" &&
    result !== null &&
    typeof result.category === "string" &&
    typeof result.subcategory === "string" &&
    typeof result.confidence === "number" &&
    result.confidence >= 0 &&
    result.confidence <= 1
  );
}
