import { Models } from 'node-appwrite';

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'none';

export interface SubscriptionLimits {
  institutionConnections: number;
  storageGB: number;
  aiChatMessagesPerMonth: number;
}

export interface SubscriptionUsage {
  institutionConnections: number;
  storageGB: number;
  aiChatMessagesThisMonth: number;
  aiChatMessagesResetDate: string;
}

export interface SubscriptionData {
  status: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
  limits: SubscriptionLimits;
  usage: SubscriptionUsage;
}

// Default limits for users with no subscription (free tier)
export const DEFAULT_NO_PLAN_LIMITS: SubscriptionData = {
  status: 'none',
  limits: {
    institutionConnections: 0, // Cannot connect banks until paid
    storageGB: 0, // Cannot upload files until paid
    aiChatMessagesPerMonth: 30, // Free tier - enough to demo app and answer questions
  },
  usage: {
    institutionConnections: 0,
    storageGB: 0,
    aiChatMessagesThisMonth: 0,
    aiChatMessagesResetDate: getNextMonthDate(),
  },
};

// Base plan limits (Koffers subscription)
export const BASE_PLAN_LIMITS: SubscriptionLimits = {
  institutionConnections: 3,
  storageGB: 10,
  aiChatMessagesPerMonth: 5000,
};

/**
 * Get the first day of next month as ISO string
 */
function getNextMonthDate(): string {
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  nextMonth.setHours(0, 0, 0, 0);
  return nextMonth.toISOString();
}

/**
 * Get subscription data from user preferences
 * Returns default no-plan limits if not found
 */
export function getSubscriptionFromPrefs(
  userPrefs: Models.Preferences
): SubscriptionData {
  if (!userPrefs.subscription) {
    return DEFAULT_NO_PLAN_LIMITS;
  }
  return userPrefs.subscription as SubscriptionData;
}

/**
 * Check if user's AI chat usage needs to be reset (monthly)
 * Returns updated subscription data if reset occurred
 */
export function checkAndResetAIUsage(
  subscription: SubscriptionData
): SubscriptionData {
  const now = new Date();
  const resetDate = new Date(subscription.usage.aiChatMessagesResetDate);

  if (now > resetDate) {
    return {
      ...subscription,
      usage: {
        ...subscription.usage,
        aiChatMessagesThisMonth: 0,
        aiChatMessagesResetDate: getNextMonthDate(),
      },
    };
  }

  return subscription;
}

/**
 * Check if user has exceeded a specific limit
 */
export function hasExceededLimit(
  current: number,
  limit: number
): boolean {
  return current >= limit;
}

/**
 * Calculate usage percentage for a limit
 */
export function getUsagePercentage(
  current: number,
  limit: number
): number {
  if (limit === 0) return 100;
  return Math.min(Math.round((current / limit) * 100), 100);
}

/**
 * Check if user is approaching a limit (>=80%)
 */
export function isApproachingLimit(
  current: number,
  limit: number
): boolean {
  return getUsagePercentage(current, limit) >= 80;
}
