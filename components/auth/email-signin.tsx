"use client";

import { useState } from "react";
import { account } from "@/lib/appwrite-client";
import { useRouter } from "next/navigation";
import { signInWithEmail } from "@/lib/auth-actions";

export function EmailSignIn() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Create account using client SDK
        await account.create("unique()", email, password);
        // Then sign in using server action (creates HTTP-only cookie)
        await signInWithEmail(email, password);
      } else {
        // Sign in using server action (creates HTTP-only cookie)
        await signInWithEmail(email, password);
      }

      // Navigate to dashboard and force refresh to load user server-side
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Email auth error:", error);
      alert(isSignUp ? "Sign up failed. Please try again." : "Sign in failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full px-4 py-3 border border-border rounded-lg hover:bg-accent transition text-sm font-medium"
      >
        Continue with Email
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card p-6 rounded-lg max-w-md w-full border border-border">
            <h2 className="text-lg font-semibold mb-4">
              {isSignUp ? "Create Account" : "Sign In"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium disabled:opacity-50"
                >
                  {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-md font-medium hover:bg-accent"
                >
                  Cancel
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
