import Link from "next/link";
import { GoogleSignIn } from "@/components/auth/google-signin";
import { AppleSignIn } from "@/components/auth/apple-signin";
import { GitHubSignIn } from "@/components/auth/github-signin";
import { EmailSignIn } from "@/components/auth/email-signin";

export default function LoginPage() {
  return (
    <div className="h-screen p-2">
      {/* Header - Logo */}
      <header className="absolute top-0 left-0 z-30 w-full">
        <div className="p-6 md:p-8">
          <Link href="/" className="text-2xl font-bold">
            Koffers
          </Link>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex h-full">
        {/* Background Image Section - Hidden on mobile, visible on desktop */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
          {/* Placeholder for background image - will add actual images later */}
        </div>

        {/* Login Form Section */}
        <div className="w-full lg:w-1/2 relative">
          {/* Form Content */}
          <div className="relative z-10 flex h-full items-center justify-center p-6">
            <div className="w-full max-w-md space-y-8">
              {/* Welcome Section */}
              <div className="text-center">
                <h1 className="text-lg mb-4 font-serif">Welcome to Koffers</h1>
                <p className="text-[#878787] text-sm mb-8">
                  New here or coming back? Choose how you want to continue
                </p>
              </div>

              {/* Sign In Options */}
              <div className="space-y-4">
                {/* Primary Sign In Option */}
                <div className="space-y-3">
                  <GoogleSignIn />
                </div>

                <div className="flex items-center justify-center">
                  <span className="text-[#878787] text-sm">Or</span>
                </div>

                {/* More Options */}
                <div className="space-y-3">
                  <AppleSignIn />
                  <GitHubSignIn />
                  <div className="border-t border-border pt-4">
                    <EmailSignIn />
                  </div>
                </div>
              </div>

              {/* Terms and Privacy */}
              <div className="text-center absolute bottom-4 left-0 right-0">
                <p className="text-xs text-[#878787] leading-relaxed font-mono">
                  By signing in you agree to our{" "}
                  <Link href="/terms" className="underline">
                    Terms of service
                  </Link>{" "}
                  &{" "}
                  <Link href="/privacy" className="underline">
                    Privacy policy
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
