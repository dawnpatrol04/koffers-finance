"use client";

import { account, OAuthProvider } from "@/lib/appwrite-client";

export function GoogleSignIn() {
  const handleSignIn = async () => {
    try {
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;
      await account.createOAuth2Session(
        OAuthProvider.Google,
        redirectUrl,
        redirectUrl
      );
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  return (
    <button
      onClick={handleSignIn}
      className="bg-primary px-6 py-4 text-secondary font-medium h-[40px] w-full rounded-md flex items-center justify-center space-x-2"
    >
      <span>Continue with Google</span>
    </button>
  );
}
