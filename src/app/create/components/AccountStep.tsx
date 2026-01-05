"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { SelectedRole } from "../types";

interface AccountStepProps {
  selectedRole: SelectedRole;
  onBack: () => void;
  onComplete: () => void;
  /** Save wizard state before OAuth redirect */
  onSaveState: () => void;
}

type AuthMode = "register" | "login";

export function AccountStep({
  selectedRole,
  onBack,
  onComplete,
  onSaveState,
}: AccountStepProps) {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);

  /**
   * Check if user already has an instructor profile.
   * If they do, redirect to dashboard instead of continuing wizard.
   */
  const checkExistingProfileAndProceed = async () => {
    // Only check for instructor role
    if (selectedRole !== "instructor") {
      onComplete();
      return;
    }

    setIsCheckingProfile(true);
    try {
      // Check for existing instructor profile via API
      const response = await fetch("/api/instructor/check-profile");
      if (response.ok) {
        const data = await response.json();
        if (data.hasProfile && data.profile) {
          // User already has an instructor profile - redirect to dashboard
          router.push("/instructor/dashboard");
          return;
        }
      }
      // No existing profile - continue to profile setup
      onComplete();
    } catch (error) {
      console.error("Failed to check instructor profile:", error);
      // On error, continue to profile setup (let them try again there)
      onComplete();
    } finally {
      setIsCheckingProfile(false);
    }
  };

  // Password strength calculator
  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    return strength;
  };

  const handlePasswordChange = (password: string) => {
    setFormData({ ...formData, password });
    setPasswordStrength(calculatePasswordStrength(password));
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return "bg-destructive";
    if (passwordStrength <= 2) return "bg-orange-500";
    if (passwordStrength <= 3) return "bg-yellow-500";
    if (passwordStrength <= 4) return "bg-blue-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return "";
    if (passwordStrength <= 1) return "Very Weak";
    if (passwordStrength <= 2) return "Weak";
    if (passwordStrength <= 3) return "Fair";
    if (passwordStrength <= 4) return "Good";
    return "Strong";
  };

  const validateForm = () => {
    if (authMode === "register") {
      if (!formData.name.trim()) {
        setError("Please enter your full name");
        return false;
      }
      if (!formData.email.trim()) {
        setError("Please enter your email address");
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setError("Please enter a valid email address");
        return false;
      }
      if (formData.password.length < 8) {
        setError("Password must be at least 8 characters long");
        return false;
      }
      if (passwordStrength < 2) {
        setError("Please choose a stronger password");
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return false;
      }
      if (!formData.agreeToTerms) {
        setError("Please agree to the Terms of Service and Privacy Policy");
        return false;
      }
    } else {
      if (!formData.email.trim()) {
        setError("Please enter your email address");
        return false;
      }
      if (!formData.password) {
        setError("Please enter your password");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (authMode === "register") {
        // Register the user
        const registerResponse = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
          }),
        });

        const registerData = await registerResponse.json();

        if (!registerResponse.ok) {
          throw new Error(registerData.error || "Registration failed");
        }

        // Now log the user in
        const loginResponse = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
          }),
        });

        const loginData = await loginResponse.json();

        if (!loginResponse.ok) {
          throw new Error(loginData.error || "Login failed after registration");
        }

        // Success - advance to profile step
        onComplete();
      } else {
        // Login mode
        const loginResponse = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
          }),
        });

        const loginData = await loginResponse.json();

        if (!loginResponse.ok) {
          throw new Error(loginData.error || "Invalid email or password");
        }

        // Check for existing instructor profile before proceeding
        // If they already have a profile, redirect to dashboard
        await checkExistingProfileAndProceed();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    // Save wizard state before redirecting
    onSaveState();
    // Redirect to Google OAuth
    window.location.href = `/api/auth/google?callbackUrl=${encodeURIComponent("/create?oauth=success")}`;
  };

  const roleLabels: Record<SelectedRole, string> = {
    organizer: "Event Organizer",
    instructor: "Dance Instructor",
    "service-provider": "Service Provider",
    restaurateur: "Restaurateur",
    vendor: "Marketplace Vendor",
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Change role</span>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {authMode === "register" ? "Create Your Account" : "Welcome Back"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {authMode === "register"
              ? `Sign up to become a ${roleLabels[selectedRole]}`
              : `Sign in to continue as ${roleLabels[selectedRole]}`}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          {/* Google OAuth */}
          <button
            onClick={handleGoogleAuth}
            type="button"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-border rounded-lg hover:bg-muted transition-colors font-medium text-foreground shadow-sm mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">
                or {authMode === "register" ? "sign up" : "sign in"} with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2"
              >
                <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </motion.div>
            )}

            {/* Name (Register only) */}
            {authMode === "register" && (
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="block w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground placeholder-muted-foreground"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="block w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground placeholder-muted-foreground"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={authMode === "register" ? "new-password" : "current-password"}
                  required
                  value={formData.password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground placeholder-muted-foreground"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                  ) : (
                    <Eye className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                  )}
                </button>
              </div>

              {/* Password Strength (Register only) */}
              {authMode === "register" && formData.password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 bg-muted rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground min-w-[60px]">
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password (Register only) */}
            {authMode === "register" && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    className="block w-full pl-10 pr-10 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground placeholder-muted-foreground"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                    ) : (
                      <Eye className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                    )}
                  </button>
                </div>
                {formData.confirmPassword && (
                  <p
                    className={`mt-1 text-xs flex items-center gap-1 ${
                      formData.password === formData.confirmPassword
                        ? "text-green-600"
                        : "text-destructive"
                    }`}
                  >
                    {formData.password === formData.confirmPassword ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        Passwords match
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" />
                        Passwords do not match
                      </>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* Terms Agreement (Register only) */}
            {authMode === "register" && (
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="agree-to-terms"
                    type="checkbox"
                    checked={formData.agreeToTerms}
                    onChange={(e) =>
                      setFormData({ ...formData, agreeToTerms: e.target.checked })
                    }
                    className="h-4 w-4 text-primary focus:ring-primary border-border rounded cursor-pointer"
                  />
                </div>
                <div className="ml-2">
                  <label
                    htmlFor="agree-to-terms"
                    className="text-xs text-foreground cursor-pointer"
                  >
                    I agree to the{" "}
                    <Link
                      href="/terms"
                      className="text-primary hover:underline"
                      target="_blank"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      className="text-primary hover:underline"
                      target="_blank"
                    >
                      Privacy Policy
                    </Link>
                  </label>
                </div>
              </div>
            )}

            {/* Forgot Password (Login only) */}
            {authMode === "login" && (
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isCheckingProfile}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading || isCheckingProfile ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isCheckingProfile
                    ? "Checking account..."
                    : authMode === "register"
                    ? "Creating account..."
                    : "Signing in..."}
                </>
              ) : authMode === "register" ? (
                "Create Account & Continue"
              ) : (
                "Sign In & Continue"
              )}
            </button>
          </form>

          {/* Toggle Auth Mode */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {authMode === "register" ? (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => {
                      setAuthMode("login");
                      setError("");
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => {
                      setAuthMode("register");
                      setError("");
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    Create one
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
