"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to send reset email");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setIsLoading(false);
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <PublicHeader showCreateButton={false} />
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="w-full max-w-md">
            <div className="bg-white dark:bg-card rounded-2xl shadow-xl p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-success" />
                </div>
                <h1 className="text-3xl font-bold text-foreground dark:text-white mb-2">
                  Check Your Email
                </h1>
                <p className="text-muted-foreground dark:text-muted-foreground">
                  We've sent a password reset link to <strong>{email}</strong>
                </p>
              </div>

              <div className="bg-primary/10 border border-primary text-primary px-4 py-3 rounded-lg text-sm mb-6">
                <p className="font-medium mb-1">Next steps:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Check your inbox for our email</li>
                  <li>Click the reset link (valid for 1 hour)</li>
                  <li>Create a new password</li>
                </ul>
              </div>

              <div className="space-y-3">
                <Link href="/login">
                  <Button className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors">
                    Back to Login
                  </Button>
                </Link>
                <button
                  onClick={() => {
                    setSuccess(false);
                    setEmail("");
                  }}
                  className="w-full py-3 border border dark:border rounded-lg text-foreground dark:text-muted-foreground hover:bg-card dark:hover:bg-muted transition-colors font-medium"
                >
                  Send to Different Email
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PublicHeader showCreateButton={false} />
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-card rounded-2xl shadow-xl p-8">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-primary hover:underline mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>

            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground dark:text-white mb-2">
                Reset Password
              </h1>
              <p className="text-muted-foreground dark:text-muted-foreground">
                Enter your email and we'll send you a reset link
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border dark:border bg-white dark:bg-card text-foreground dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="you@example.com"
                />
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                Remember your password?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
