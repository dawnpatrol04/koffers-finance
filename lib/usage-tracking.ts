import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-config';
import { createAdminClient } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';

/**
 * Increment token usage for a user
 * Called from chat API after each completion
 */
export async function incrementTokenUsage(
  userId: string,
  tokens: number
): Promise<void> {
  const { databases } = await createAdminClient();

  // Get current subscription
  const subscriptions = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    [Query.equal('userId', userId)]
  );

  if (subscriptions.documents.length === 0) {
    throw new Error('No subscription found for user');
  }

  const subscription = subscriptions.documents[0];

  // Update usage counters
  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    subscription.$id,
    {
      currentTokensUsed: (subscription.currentTokensUsed || 0) + tokens,
      lifetimeTokensUsed: (subscription.lifetimeTokensUsed || 0) + tokens,
    }
  );
}

/**
 * Check if user has enough tokens remaining
 * Called BEFORE allowing chat message
 */
export async function checkTokenLimit(userId: string): Promise<{
  allowed: boolean;
  tokensUsed: number;
  tokensLimit: number;
  tokensRemaining: number;
  percentUsed: number;
}> {
  const { databases } = await createAdminClient();

  const subscriptions = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    [Query.equal('userId', userId)]
  );

  if (subscriptions.documents.length === 0) {
    // New user - allow demo usage (30 free tokens = ~30 messages)
    return {
      allowed: true,
      tokensUsed: 0,
      tokensLimit: 30,
      tokensRemaining: 30,
      percentUsed: 0,
    };
  }

  const subscription = subscriptions.documents[0];
  const tokensUsed = subscription.currentTokensUsed || 0;
  const tokensLimit = subscription.maxTokensPerMonth + (subscription.addonTokens || 0);
  const tokensRemaining = Math.max(0, tokensLimit - tokensUsed);
  const percentUsed = (tokensUsed / tokensLimit) * 100;

  return {
    allowed: tokensRemaining > 0,
    tokensUsed,
    tokensLimit,
    tokensRemaining,
    percentUsed,
  };
}

/**
 * Get current usage stats for display
 */
export async function getUsageStats(userId: string) {
  const { databases } = await createAdminClient();

  const subscriptions = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    [Query.equal('userId', userId)]
  );

  if (subscriptions.documents.length === 0) {
    return {
      tokens: { used: 0, limit: 30, remaining: 30, percentUsed: 0 },
      storage: { used: 0, limit: 0, remaining: 0, percentUsed: 0 },
      banks: { used: 0, limit: 0, remaining: 0, percentUsed: 0 },
    };
  }

  const sub = subscriptions.documents[0];

  const tokensLimit = (sub.maxTokensPerMonth || 0) + (sub.addonTokens || 0);
  const storageLimit = (sub.maxStorageGB || 0) + (sub.addonStorage || 0);
  const banksLimit = (sub.maxBanks || 0) + (sub.addonBanks || 0);

  return {
    tokens: {
      used: sub.currentTokensUsed || 0,
      limit: tokensLimit,
      remaining: Math.max(0, tokensLimit - (sub.currentTokensUsed || 0)),
      percentUsed: tokensLimit > 0 ? ((sub.currentTokensUsed || 0) / tokensLimit) * 100 : 0,
    },
    storage: {
      used: sub.currentStorageUsedGB || 0,
      limit: storageLimit,
      remaining: Math.max(0, storageLimit - (sub.currentStorageUsedGB || 0)),
      percentUsed: storageLimit > 0 ? ((sub.currentStorageUsedGB || 0) / storageLimit) * 100 : 0,
    },
    banks: {
      used: sub.currentBanksConnected || 0,
      limit: banksLimit,
      remaining: Math.max(0, banksLimit - (sub.currentBanksConnected || 0)),
      percentUsed: banksLimit > 0 ? ((sub.currentBanksConnected || 0) / banksLimit) * 100 : 0,
    },
  };
}

/**
 * Reset monthly usage counters
 * Called by Stripe webhook on billing cycle renewal
 */
export async function resetMonthlyUsage(userId: string): Promise<void> {
  const { databases } = await createAdminClient();

  const subscriptions = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    [Query.equal('userId', userId)]
  );

  if (subscriptions.documents.length === 0) {
    return;
  }

  const subscription = subscriptions.documents[0];

  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    subscription.$id,
    {
      currentTokensUsed: 0,
      lastTokenResetAt: new Date().toISOString(),
    }
  );
}
