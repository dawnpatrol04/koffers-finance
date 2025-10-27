"use client";

import { account, OAuthProvider } from "@/lib/appwrite";

export function GitHubSignIn() {
  const handleSignIn = async () => {
    try {
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;
      await account.createOAuth2Session(
        OAuthProvider.Github,
        redirectUrl,
        redirectUrl
      );
    } catch (error) {
      console.error("GitHub sign-in error:", error);
    }
  };

  return (
    <button
      onClick={handleSignIn}
      className="w-full px-4 py-3 border border-border rounded-lg hover:bg-accent transition text-sm font-medium"
    >
      Continue with GitHub
    </button>
  );
}
