"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Eye, EyeOff, Check } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Password strength validation
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordsMatch = password === confirmPassword && confirmPassword !== "";

  const isPasswordValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumber;

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid or missing reset token");
      return;
    }

    if (!isPasswordValid) {
      setError("Password does not meet requirements");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to reset password");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login?reset=success");
      }, 2000);
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
            <div className="bg-white dark:bg-card rounded-2xl shadow-xl p-8 text-center">
              <div className="w-16 h-16 bg-success/20 dark:bg-success/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-success dark:text-success" />
              </div>
              <h1 className="text-3xl font-bold text-foreground dark:text-white mb-2">
                Password Reset Complete!
              </h1>
              <p className="text-muted-foreground dark:text-muted-foreground mb-6">
                Your password has been successfully reset. Redirecting to login...
              </p>
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
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground dark:text-white mb-2">
                Create New Password
              </h1>
              <p className="text-muted-foreground dark:text-muted-foreground">
                Enter a new password for your account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 pr-12 rounded-lg border border dark:border bg-white dark:bg-card text-foreground dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 pr-12 rounded-lg border border dark:border bg-white dark:bg-card text-foreground dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password strength indicator */}
              {password && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground dark:text-muted-foreground">
                    Password requirements:
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li
                      className={`flex items-center gap-2 ${hasMinLength ? "text-success dark:text-success" : "text-muted-foreground dark:text-muted-foreground"}`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center ${hasMinLength ? "bg-success/20 dark:bg-success/15" : "bg-muted dark:bg-card"}`}
                      >
                        {hasMinLength && <Check className="w-3 h-3" />}
                      </div>
                      At least 8 characters
                    </li>
                    <li
                      className={`flex items-center gap-2 ${hasUpperCase ? "text-success dark:text-success" : "text-muted-foreground dark:text-muted-foreground"}`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center ${hasUpperCase ? "bg-success/20 dark:bg-success/15" : "bg-muted dark:bg-card"}`}
                      >
                        {hasUpperCase && <Check className="w-3 h-3" />}
                      </div>
                      One uppercase letter
                    </li>
                    <li
                      className={`flex items-center gap-2 ${hasLowerCase ? "text-success dark:text-success" : "text-muted-foreground dark:text-muted-foreground"}`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center ${hasLowerCase ? "bg-success/20 dark:bg-success/15" : "bg-muted dark:bg-card"}`}
                      >
                        {hasLowerCase && <Check className="w-3 h-3" />}
                      </div>
                      One lowercase letter
                    </li>
                    <li
                      className={`flex items-center gap-2 ${hasNumber ? "text-success dark:text-success" : "text-muted-foreground dark:text-muted-foreground"}`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center ${hasNumber ? "bg-success/20 dark:bg-success/15" : "bg-muted dark:bg-card"}`}
                      >
                        {hasNumber && <Check className="w-3 h-3" />}
                      </div>
                      One number
                    </li>
                    {confirmPassword && (
                      <li
                        className={`flex items-center gap-2 ${passwordsMatch ? "text-success dark:text-success" : "text-muted-foreground dark:text-muted-foreground"}`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center ${passwordsMatch ? "bg-success/20 dark:bg-success/15" : "bg-muted dark:bg-card"}`}
                        >
                          {passwordsMatch && <Check className="w-3 h-3" />}
                        </div>
                        Passwords match
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {error && (
                <div className="bg-destructive/10 dark:bg-destructive/15 border border-destructive/30 dark:border-destructive/30 text-destructive dark:text-destructive px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || !isPasswordValid || !passwordsMatch}
                className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Resetting Password..." : "Reset Password"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm text-primary hover:underline font-medium">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
