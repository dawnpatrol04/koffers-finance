"use client";

import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

const mockPostContent: Record<string, any> = {
  "1": {
    title: "The Future of Personal Finance: AI-Powered Money Management",
    author: "Sarah Johnson",
    date: "March 15, 2025",
    category: "AI & Technology",
    readTime: "5 min read",
    content: `
The landscape of personal finance is undergoing a revolutionary transformation, powered by artificial intelligence and machine learning. As we step further into 2025, AI-powered money management tools are becoming increasingly sophisticated, accessible, and integral to how we handle our finances.

## The AI Revolution in Finance

Gone are the days of manual budgeting spreadsheets and guesswork. Today's AI-powered financial tools can analyze thousands of transactions, identify spending patterns, and provide personalized recommendations in seconds. These systems learn from your behavior, adapting to your unique financial situation and goals.

### Key Benefits of AI Money Management

**Automated Budgeting**
AI algorithms can automatically categorize your expenses, track your spending patterns, and create dynamic budgets that adjust based on your income fluctuations and lifestyle changes. No more manual entry or forgotten transactions.

**Predictive Analytics**
By analyzing your historical data and comparing it with market trends, AI can predict your future expenses, identify potential financial risks, and suggest proactive measures to avoid overspending.

**Personalized Investment Strategies**
Modern AI tools can assess your risk tolerance, financial goals, and market conditions to recommend investment strategies tailored specifically to you. They continuously monitor and rebalance your portfolio to optimize returns.

## Real-World Applications

Financial institutions and fintech companies are already deploying AI in innovative ways:

- **Smart Savings**: AI algorithms that automatically transfer small amounts to savings based on your spending patterns
- **Fraud Detection**: Real-time transaction monitoring that can identify and prevent fraudulent activity
- **Bill Negotiation**: AI agents that negotiate better rates on your recurring bills
- **Tax Optimization**: Intelligent systems that identify tax-saving opportunities throughout the year

## The Human Touch

While AI is powerful, it's important to remember that it's a tool to enhance, not replace, human financial decision-making. The best approach combines AI's analytical power with human judgment and emotional intelligence.

## Looking Ahead

As AI technology continues to evolve, we can expect even more sophisticated personal finance tools. The future holds promise for completely automated financial management systems that can handle everything from daily budgeting to long-term retirement planning.

The key is to start now. Familiarize yourself with AI-powered financial tools, understand their capabilities, and integrate them into your financial strategy. The future of personal finance is here, and it's powered by artificial intelligence.
    `,
  },
  "2": {
    title: "5 Smart Strategies to Build Your Emergency Fund",
    author: "Michael Chen",
    date: "March 12, 2025",
    category: "Savings",
    readTime: "7 min read",
    content: `
An emergency fund is your financial safety net, protecting you from unexpected expenses and providing peace of mind. Yet, many people struggle to build one. Here are five proven strategies to create a robust emergency fund.

## Why You Need an Emergency Fund

Before diving into strategies, let's understand why emergency funds are crucial. Life is unpredictable—car repairs, medical bills, job loss—these situations can arise without warning. An emergency fund ensures you're prepared without going into debt.

### Strategy 1: Start Small, Think Big

Don't let the goal of saving 6-12 months of expenses overwhelm you. Start with a micro-goal: $500, then $1,000. Small wins build momentum and create positive financial habits.

**Action Steps:**
- Set an initial goal of $500
- Automate weekly transfers of $25
- Celebrate when you hit milestones

### Strategy 2: Automate Your Savings

The best savings plan is one you don't have to think about. Set up automatic transfers from your checking account to a dedicated savings account right after payday.

**Pro Tip:** Treat your emergency fund contribution like a bill—non-negotiable and automatic.

### Strategy 3: Use the "Windfall" Method

Commit to saving a portion of any unexpected money:
- Tax refunds
- Work bonuses
- Cash gifts
- Side hustle income

Even allocating 50% of windfalls to your emergency fund can accelerate your progress significantly.

### Strategy 4: Reduce One Major Expense

Identify your biggest discretionary expense and cut it by 50% for 3-6 months. Common candidates:
- Dining out
- Subscription services
- Entertainment
- Shopping

Channel those savings directly into your emergency fund.

### Strategy 5: Earn More, Save More

Consider temporary side income specifically for building your emergency fund:
- Freelance work
- Selling unused items
- Part-time gig work
- Online tutoring

The key is to save 100% of this additional income, not incorporate it into your regular budget.

## Where to Keep Your Emergency Fund

Your emergency fund should be:
- Easily accessible
- In a separate account from daily spending
- FDIC insured
- Earning interest (high-yield savings account)

Avoid keeping it in:
- Checking accounts (too easy to spend)
- Stocks or investments (too volatile)
- Under your mattress (no interest, not secure)

## Final Thoughts

Building an emergency fund requires discipline, but the financial security it provides is invaluable. Start today, stay consistent, and watch your safety net grow. Your future self will thank you.
    `,
  },
};

export default function BlogPostPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const post = mockPostContent[params.id];

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <h1 className="text-2xl font-semibold mb-4">Post Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The blog post you're looking for doesn't exist.
        </p>
        <Button onClick={() => router.push("/blog")}>Back to Blog</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Back Button */}
      <div className="border-b border-border bg-background px-6 py-4">
        <button
          onClick={() => router.push("/blog")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <Icons.ArrowBack size={16} />
          Back to Blog
        </button>
      </div>

      {/* Article Header */}
      <div className="border-b border-border bg-background px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-medium text-primary">
              {post.category}
            </span>
            <span className="text-sm text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">
              {post.readTime}
            </span>
          </div>
          <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{post.author}</span>
            <span>•</span>
            <span>{post.date}</span>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="flex-1 px-6 py-12">
        <article className="max-w-3xl mx-auto prose prose-gray dark:prose-invert">
          <div
            className="text-base leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: post.content
                .split("\n\n")
                .map((paragraph: string) => {
                  if (paragraph.startsWith("## ")) {
                    return `<h2 class="text-2xl font-semibold mt-8 mb-4">${paragraph.substring(3)}</h2>`;
                  }
                  if (paragraph.startsWith("### ")) {
                    return `<h3 class="text-xl font-semibold mt-6 mb-3">${paragraph.substring(4)}</h3>`;
                  }
                  if (paragraph.startsWith("**") && paragraph.endsWith("**")) {
                    return `<p class="font-semibold mt-4 mb-2">${paragraph.slice(2, -2)}</p>`;
                  }
                  if (paragraph.startsWith("- ")) {
                    const items = paragraph
                      .split("\n")
                      .map((item) => `<li>${item.substring(2)}</li>`)
                      .join("");
                    return `<ul class="list-disc pl-6 mb-4 space-y-2">${items}</ul>`;
                  }
                  return `<p class="mb-4 text-muted-foreground">${paragraph}</p>`;
                })
                .join(""),
            }}
          />
        </article>
      </div>

      {/* Footer CTA */}
      <div className="border-t border-border bg-[#F2F1EF] dark:bg-secondary px-6 py-8">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-xl font-semibold mb-3">
            Ready to take control of your finances?
          </h3>
          <p className="text-muted-foreground mb-6">
            Join thousands of users who are already managing their money smarter
            with Koffers.
          </p>
          <Button size="lg">Get Started Free</Button>
        </div>
      </div>
    </div>
  );
}
