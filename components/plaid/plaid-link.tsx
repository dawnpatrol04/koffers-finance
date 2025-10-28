"use client";

import { useEffect, useState, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { useUser } from '@/contexts/user-context';

interface PlaidLinkProps {
  onSuccess?: () => void;
}

export function PlaidLink({ onSuccess }: PlaidLinkProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const { user } = useUser();

  // Fetch link token from API
  useEffect(() => {
    if (!user?.$id) return;

    const fetchLinkToken = async () => {
      try {
        const response = await fetch('/api/plaid/create-link-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.$id }),
        });

        const data = await response.json();
        setLinkToken(data.link_token);
      } catch (error) {
        console.error('Error fetching link token:', error);
      }
    };

    fetchLinkToken();
  }, [user?.$id]);

  const onPlaidSuccess = useCallback(
    async (public_token: string) => {
      try {
        // Exchange public token for access token
        const exchangeResponse = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_token,
            userId: user?.$id,
          }),
        });

        const exchangeData = await exchangeResponse.json();
        console.log('✅ Bank account connected!', exchangeData);

        // Fetch transactions and accounts data
        const fetchResponse = await fetch('/api/plaid/fetch-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user?.$id }),
        });

        const fetchData = await fetchResponse.json();
        console.log('✅ Data fetched!', fetchData);

        if (onSuccess) {
          onSuccess();
        }
      } catch (error) {
        console.error('Error in Plaid flow:', error);
      }
    },
    [user?.$id, onSuccess]
  );

  const config = {
    token: linkToken,
    onSuccess: onPlaidSuccess,
  };

  const { open, ready } = usePlaidLink(config);

  if (!linkToken || !ready) {
    return (
      <button
        disabled
        className="px-4 py-2 border border-border rounded-md text-sm font-medium opacity-50 cursor-not-allowed"
      >
        Loading...
      </button>
    );
  }

  return (
    <button
      onClick={() => open()}
      className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition"
    >
      Connect Bank Account
    </button>
  );
}
