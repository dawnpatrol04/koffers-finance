"use client";

import { EmailSignIn } from "@/components/auth/email-signin";
import { GoogleSignIn } from "@/components/auth/google-signin";
import { GitHubSignIn } from "@/components/auth/github-signin";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to Koffers</h1>
          <p className="text-muted-foreground">Sign in to continue</p>
        </div>

        <div className="space-y-3">
          <GoogleSignIn />
          <GitHubSignIn />
          <EmailSignIn />
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-primary">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-primary">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
