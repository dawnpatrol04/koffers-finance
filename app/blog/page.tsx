"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  category: string;
  readTime: string;
}

const mockPosts: BlogPost[] = [
  {
    id: "1",
    title: "The Future of Personal Finance: AI-Powered Money Management",
    excerpt:
      "Discover how artificial intelligence is revolutionizing the way we manage our finances, from automated budgeting to intelligent investment strategies.",
    author: "Sarah Johnson",
    date: "March 15, 2025",
    category: "AI & Technology",
    readTime: "5 min read",
  },
  {
    id: "2",
    title: "5 Smart Strategies to Build Your Emergency Fund",
    excerpt:
      "Learn practical, actionable steps to create a financial safety net that will protect you during unexpected life events.",
    author: "Michael Chen",
    date: "March 12, 2025",
    category: "Savings",
    readTime: "7 min read",
  },
  {
    id: "3",
    title: "Understanding Credit Scores: A Complete Guide",
    excerpt:
      "Everything you need to know about credit scores, how they're calculated, and how to improve yours for better financial opportunities.",
    author: "Emily Rodriguez",
    date: "March 10, 2025",
    category: "Credit",
    readTime: "8 min read",
  },
  {
    id: "4",
    title: "Maximizing Your Tax Refund: Tips from Financial Experts",
    excerpt:
      "Discover expert strategies to optimize your tax return and make the most of deductions and credits available to you.",
    author: "David Kim",
    date: "March 8, 2025",
    category: "Taxes",
    readTime: "6 min read",
  },
  {
    id: "5",
    title: "The Psychology of Spending: Why We Buy What We Buy",
    excerpt:
      "Explore the psychological triggers behind spending decisions and learn how to make more mindful financial choices.",
    author: "Lisa Thompson",
    date: "March 5, 2025",
    category: "Behavioral Finance",
    readTime: "9 min read",
  },
  {
    id: "6",
    title: "Investing for Beginners: Your First Steps to Wealth Building",
    excerpt:
      "A beginner-friendly guide to getting started with investing, including different investment types and risk management strategies.",
    author: "James Martinez",
    date: "March 1, 2025",
    category: "Investing",
    readTime: "10 min read",
  },
];

const categories = [
  "All",
  "AI & Technology",
  "Savings",
  "Credit",
  "Taxes",
  "Behavioral Finance",
  "Investing",
];

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredPosts =
    selectedCategory === "All"
      ? mockPosts
      : mockPosts.filter((post) => post.category === selectedCategory);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 py-8">
        <h1 className="text-3xl font-semibold mb-2">Koffers Blog</h1>
        <p className="text-muted-foreground">
          Insights, tips, and strategies for better financial management
        </p>
      </div>

      {/* Category Filter */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                selectedCategory === category
                  ? "bg-primary text-primary-foreground"
                  : "bg-[#F2F1EF] dark:bg-secondary text-[#606060] hover:bg-[#E8E7E5] dark:hover:bg-secondary/80"
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Blog Posts Grid */}
      <div className="flex-1 px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl">
          {filteredPosts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.id}`}
              className="group block"
            >
              <div className="border border-border rounded-lg p-6 bg-background hover:bg-[#F2F1EF] dark:hover:bg-secondary transition-colors h-full flex flex-col">
                {/* Category & Read Time */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-primary">
                    {post.category}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {post.readTime}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                  {post.title}
                </h2>

                {/* Excerpt */}
                <p className="text-sm text-muted-foreground mb-4 flex-1">
                  {post.excerpt}
                </p>

                {/* Author & Date */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <span className="text-sm font-medium">{post.author}</span>
                  <span className="text-xs text-muted-foreground">
                    {post.date}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No posts found in this category.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
