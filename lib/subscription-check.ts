/**
 * Subscription Access Control
 *
 * This module provides server-side utilities to check if a user has
 * an active paid subscription and enforce access control.
 */

import { getCurrentUser, createAdminClient } from './appwrite-server';
import { DATABASE_ID, COLLECTIONS } from './appwrite-config';
import { Query } from 'node-appwrite';

export interface SubscriptionCheckResult {
  hasAccess: boolean;
  subscription: any | null;
  reason?: string;
}

/**
 * Check if a user has an active paid subscription
 *
 * This function is used by middleware and server components to enforce
 * subscription-based access control.
 *
 * @returns Object with access status and subscription data
 */
export async function checkSubscriptionAccess(): Promise<SubscriptionCheckResult> {
  try {
    // Get authenticated user
    const user = await getCurrentUser();

    if (!user) {
      return {
        hasAccess: false,
        subscription: null,
        reason: 'not_authenticated'
      };
    }

    // Query subscriptions collection
    const { databases } = await createAdminClient();
    const subscriptions = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.SUBSCRIPTIONS,
      [Query.equal('userId', user.$id)]
    );

    // No subscription found
    if (subscriptions.documents.length === 0) {
      return {
        hasAccess: false,
        subscription: null,
        reason: 'no_subscription'
      };
    }

    const subscription = subscriptions.documents[0];

    // Check subscription status
    const activeStatuses = ['active', 'trialing'];
    const hasActiveSubscription = activeStatuses.includes(subscription.status);

    if (!hasActiveSubscription) {
      return {
        hasAccess: false,
        subscription,
        reason: `subscription_${subscription.status}` // e.g., 'subscription_canceled', 'subscription_past_due'
      };
    }

    // Check if subscription has expired (even if status is 'active')
    if (subscription.currentPeriodEnd) {
      const periodEnd = new Date(subscription.currentPeriodEnd);
      const now = new Date();

      if (now > periodEnd) {
        return {
          hasAccess: false,
          subscription,
          reason: 'subscription_expired'
        };
      }
    }

    // User has active subscription with valid period
    return {
      hasAccess: true,
      subscription,
    };
  } catch (error) {
    console.error('Error checking subscription access:', error);
    // On error, deny access for security
    return {
      hasAccess: false,
      subscription: null,
      reason: 'error_checking_subscription'
    };
  }
}

/**
 * Get user-friendly message for access denial reason
 */
export function getAccessDeniedMessage(reason?: string): string {
  switch (reason) {
    case 'not_authenticated':
      return 'Please log in to continue.';
    case 'no_subscription':
      return 'You need an active subscription to access this feature.';
    case 'subscription_canceled':
      return 'Your subscription has been canceled. Please reactivate to continue.';
    case 'subscription_past_due':
      return 'Your subscription payment is past due. Please update your payment method.';
    case 'subscription_expired':
      return 'Your subscription has expired. Please renew to continue.';
    case 'error_checking_subscription':
      return 'Unable to verify subscription status. Please try again later.';
    default:
      return 'Access denied. Please contact support if you believe this is an error.';
  }
}
