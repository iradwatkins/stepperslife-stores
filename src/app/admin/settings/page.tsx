"use client";

import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/convex/_generated/api";
import {
  Settings as SettingsIcon,
  Bell,
  CreditCard,
  Shield,
  Database,
  Mail,
  Zap,
  AlertCircle,
  CheckCircle2,
  Info,
  Trash2,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"general" | "payments" | "notifications" | "security">(
    "general"
  );

  // Show loading while Convex auth is being resolved
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

  // If auth completed but user is not authenticated, Convex queries will never return data
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Authentication required to view this page.</p>
          <a href="/login?redirect=/admin/settings" className="text-primary hover:underline">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "general", name: "General", icon: SettingsIcon },
    { id: "payments", name: "Payments", icon: CreditCard },
    { id: "notifications", name: "Notifications", icon: Bell },
    { id: "security", name: "Security", icon: Shield },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Platform Settings</h1>
        <p className="text-muted-foreground mt-1">Configure platform-wide settings and preferences</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    isActive
                      ? "border-destructive text-destructive"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-md">
        {activeTab === "general" && <GeneralSettings />}
        {activeTab === "payments" && <PaymentSettings />}
        {activeTab === "notifications" && <NotificationSettings />}
        {activeTab === "security" && <SecuritySettings />}
      </div>
    </div>
  );
}

// Feature flag toggle component
function FeatureFlagToggle({
  flagKey,
  title,
  description,
  enabled,
  isUpdating,
  onToggle,
}: {
  flagKey: string;
  title: string;
  description: string;
  enabled: boolean;
  isUpdating: boolean;
  onToggle: (key: string, enabled: boolean) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between p-4 rounded-lg ${
        enabled ? "bg-success/10" : "bg-muted"
      }`}
    >
      <div className="flex items-center gap-3">
        {enabled ? (
          <CheckCircle2 className="w-5 h-5 text-success" />
        ) : (
          <AlertCircle className="w-5 h-5 text-muted-foreground" />
        )}
        <div>
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onToggle(flagKey, !enabled)}
        disabled={isUpdating}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          enabled
            ? "bg-success focus:ring-success"
            : "bg-muted-foreground/30 focus:ring-muted-foreground"
        } ${isUpdating ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function GeneralSettings() {
  const featureFlags = useQuery(api.admin.featureFlags.getAllFeatureFlags);
  const setFeatureFlag = useMutation(api.admin.featureFlags.setFeatureFlag);
  const initializeFlags = useMutation(api.admin.featureFlags.initializeDefaultFlags);
  const [updatingFlags, setUpdatingFlags] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  // Platform settings state
  const platformSettings = useQuery(api.admin.platformSettings.getAllSettings);
  const updateSettings = useMutation(api.admin.platformSettings.updateSettings);
  const initializePlatformSettings = useMutation(api.admin.platformSettings.initializeDefaultSettings);
  const [platformName, setPlatformName] = useState("Steppers Life Events");
  const [supportEmail, setSupportEmail] = useState("support@stepperslife.com");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [platformSettingsInitialized, setPlatformSettingsInitialized] = useState(false);

  // Initialize platform settings from database
  useEffect(() => {
    if (platformSettings !== undefined) {
      if (platformSettings.length === 0 && !platformSettingsInitialized) {
        setPlatformSettingsInitialized(true);
        initializePlatformSettings({}).catch(console.error);
      } else {
        const nameValue = platformSettings.find((s) => s.key === "platform_name")?.value;
        const emailValue = platformSettings.find((s) => s.key === "support_email")?.value;
        if (nameValue) setPlatformName(nameValue);
        if (emailValue) setSupportEmail(emailValue);
      }
    }
  }, [platformSettings, platformSettingsInitialized, initializePlatformSettings]);

  // Track changes
  useEffect(() => {
    if (platformSettings) {
      const originalName = platformSettings.find((s) => s.key === "platform_name")?.value ?? "Steppers Life Events";
      const originalEmail = platformSettings.find((s) => s.key === "support_email")?.value ?? "support@stepperslife.com";
      setHasChanges(platformName !== originalName || supportEmail !== originalEmail);
    }
  }, [platformName, supportEmail, platformSettings]);

  // Save platform settings
  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await updateSettings({
        settings: [
          { key: "platform_name", value: platformName },
          { key: "support_email", value: supportEmail },
        ],
      });
      setSaveSuccess(true);
      setHasChanges(false);
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Initialize default flags if none exist
  useEffect(() => {
    if (featureFlags !== undefined && featureFlags.length === 0 && !initialized) {
      setInitialized(true);
      initializeFlags({}).catch(console.error);
    }
  }, [featureFlags, initialized, initializeFlags]);

  const handleToggle = async (key: string, enabled: boolean) => {
    setUpdatingFlags((prev) => new Set(prev).add(key));
    try {
      await setFeatureFlag({ key, enabled });
    } catch (error) {
      console.error("Failed to update feature flag:", error);
    } finally {
      setUpdatingFlags((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // Helper to get flag value
  const getFlagEnabled = (key: string) => {
    const flag = featureFlags?.find((f) => f.key === key);
    return flag?.enabled ?? false;
  };

  const getFlagDescription = (key: string) => {
    const descriptions: Record<string, { title: string; desc: string }> = {
      testing_mode: {
        title: "Testing Mode",
        desc: "Bypass Square payment processing for testing",
      },
      staff_commission_system: {
        title: "Staff Commission System",
        desc: "Referral tracking and commissions",
      },
      email_notifications: {
        title: "Email Notifications",
        desc: "Send automated emails via Postal",
      },
      event_analytics: {
        title: "Event Analytics",
        desc: "Advanced analytics for organizers",
      },
      push_notifications: {
        title: "Push Notifications",
        desc: "Push notifications to staff devices",
      },
    };
    return descriptions[key] || { title: key, desc: "" };
  };

  const isLoading = featureFlags === undefined;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4">General Settings</h2>
        <p className="text-muted-foreground text-sm">Configure basic platform settings and defaults</p>
      </div>

      {/* Platform Information */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Platform Information</h3>
          {saveSuccess && (
            <span className="flex items-center gap-1 text-sm text-success">
              <CheckCircle2 className="w-4 h-4" />
              Settings saved!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Platform Name</label>
            <input
              type="text"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-destructive focus:border-transparent"
              placeholder="Enter platform name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Support Email</label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-destructive focus:border-transparent"
              placeholder="Enter support email"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={isSaving || !hasChanges}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              hasChanges
                ? "bg-destructive text-white hover:bg-destructive/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            } ${isSaving ? "opacity-50 cursor-wait" : ""}`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Default Settings */}
      <div className="space-y-4 pt-6 border-t border-border">
        <h3 className="font-semibold text-foreground">Default Settings</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium text-foreground">Default Platform Fee</p>
              <p className="text-sm text-muted-foreground">Fee charged per ticket sale</p>
            </div>
            <span className="text-lg font-bold text-foreground">10%</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium text-foreground">Default Organizer Credits</p>
              <p className="text-sm text-muted-foreground">Credits given to new organizers</p>
            </div>
            <span className="text-lg font-bold text-foreground">100</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium text-foreground">Maximum File Upload Size</p>
              <p className="text-sm text-muted-foreground">For event images and assets</p>
            </div>
            <span className="text-lg font-bold text-foreground">5 MB</span>
          </div>
        </div>
      </div>

      {/* Feature Flags */}
      <div className="space-y-4 pt-6 border-t border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Feature Flags</h3>
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {isLoading ? (
            // Loading skeleton
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-muted rounded-lg animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-muted-foreground/20 rounded-full" />
                    <div>
                      <div className="h-4 w-32 bg-muted-foreground/20 rounded mb-2" />
                      <div className="h-3 w-48 bg-muted-foreground/20 rounded" />
                    </div>
                  </div>
                  <div className="w-11 h-6 bg-muted-foreground/20 rounded-full" />
                </div>
              ))}
            </>
          ) : (
            // Feature flag toggles
            ["testing_mode", "staff_commission_system", "email_notifications", "event_analytics", "push_notifications"].map(
              (key) => {
                const { title, desc } = getFlagDescription(key);
                return (
                  <FeatureFlagToggle
                    key={key}
                    flagKey={key}
                    title={title}
                    description={desc}
                    enabled={getFlagEnabled(key)}
                    isUpdating={updatingFlags.has(key)}
                    onToggle={handleToggle}
                  />
                );
              }
            )
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentSettings() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4">Payment Settings</h2>
        <p className="text-muted-foreground text-sm">Configure payment processing and financial settings</p>
      </div>

      {/* Square Integration */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Square Integration</h3>

        <div className="bg-success/10 border border-success/20 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="w-6 h-6 text-success" />
            <div>
              <p className="font-semibold text-success">Square Connected</p>
              <p className="text-sm text-success">Production environment active</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Application ID</p>
              <p className="font-mono text-foreground">sq0idp-XG8i...H6Q</p>
            </div>
            <div>
              <p className="text-muted-foreground">Location ID</p>
              <p className="font-mono text-foreground">L0Q2...BGD8</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Configuration */}
      <div className="space-y-4 pt-6 border-t border-border">
        <h3 className="font-semibold text-foreground">Payment Configuration</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium text-foreground">Minimum Order Amount</p>
              <p className="text-sm text-muted-foreground">Minimum ticket purchase value</p>
            </div>
            <span className="text-lg font-bold text-foreground">$1.00</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium text-foreground">Maximum Order Amount</p>
              <p className="text-sm text-muted-foreground">Maximum ticket purchase value</p>
            </div>
            <span className="text-lg font-bold text-foreground">$10,000</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium text-foreground">Payment Methods Accepted</p>
              <p className="text-sm text-muted-foreground">Supported payment options</p>
            </div>
            <div className="text-right">
              <p className="font-medium text-foreground">Card, Cash App</p>
              <p className="text-sm text-muted-foreground">Google Pay, Apple Pay</p>
            </div>
          </div>
        </div>
      </div>

      {/* Testing Mode Warning */}
      <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div className="text-sm text-warning">
          <p className="font-medium mb-1">Testing Mode Active</p>
          <p>
            Payment processing is currently bypassed for testing. No real charges will be made.
            Disable testing mode in production.
          </p>
        </div>
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4">Notification Settings</h2>
        <p className="text-muted-foreground text-sm">Configure email and system notifications</p>
      </div>

      {/* Email Notifications */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Email Notifications</h3>

        <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex gap-3">
          <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
          <div className="text-sm text-success">
            <p className="font-medium mb-1">Postal Email Configured</p>
            <p>
              Email notifications are configured via Postal (postal.toolboxhosting.com).
              Automated emails for order confirmations, event reminders, and digests are active.
            </p>
          </div>
        </div>
      </div>

      {/* Notification Types */}
      <div className="space-y-4 pt-6 border-t border-border">
        <h3 className="font-semibold text-foreground">Notification Types</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-success/10 rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-success" />
              <div>
                <p className="font-medium text-foreground">Order Confirmation</p>
                <p className="text-sm text-muted-foreground">Send receipt after ticket purchase</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-success text-white rounded-full text-xs font-medium">
              ENABLED
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-success/10 rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-success" />
              <div>
                <p className="font-medium text-foreground">Event Reminder</p>
                <p className="text-sm text-muted-foreground">Remind attendees 24h before event</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-success text-white rounded-full text-xs font-medium">
              ENABLED
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Welcome Email</p>
                <p className="text-sm text-muted-foreground">Welcome new users and organizers</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-muted text-foreground rounded-full text-xs font-medium">
              COMING SOON
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-success/10 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-success" />
              <div>
                <p className="font-medium text-foreground">Admin Alerts</p>
                <p className="text-sm text-muted-foreground">Push notifications to staff devices</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-success text-white rounded-full text-xs font-medium">
              ENABLED
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecuritySettings() {
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState<any>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const resetDatabase = useMutation(api.admin.cleanup.resetAll);

  const handleReset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }

    setIsResetting(true);
    try {
      const result = await resetDatabase({ keepUserEmail: "thestepperslife@gmail.com" });
      setResetResult(result);
      setConfirmReset(false);
    } catch (error: any) {
      toast.error("Reset failed: " + error.message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4">Security Settings</h2>
        <p className="text-muted-foreground text-sm">Configure security and access control settings</p>
      </div>

      {/* Authentication */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Authentication</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-success/10 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <div>
                <p className="font-medium text-foreground">Custom JWT + OAuth</p>
                <p className="text-sm text-muted-foreground">Email/Password and Google OAuth authentication</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-success text-white rounded-full text-xs font-medium">
              ACTIVE
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-warning/10 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-warning" />
              <div>
                <p className="font-medium text-foreground">Testing Mode Authentication</p>
                <p className="text-sm text-muted-foreground">Bypass auth for development</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-warning text-white rounded-full text-xs font-medium">
              ENABLED
            </span>
          </div>
        </div>
      </div>

      {/* Access Control */}
      <div className="space-y-4 pt-6 border-t border-border">
        <h3 className="font-semibold text-foreground">Access Control</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium text-foreground">Role-Based Access</p>
              <p className="text-sm text-muted-foreground">Admin, Organizer, User roles</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-success" />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium text-foreground">Admin Dashboard Protection</p>
              <p className="text-sm text-muted-foreground">Admin-only access control</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-success" />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium text-foreground">API Rate Limiting</p>
              <p className="text-sm text-muted-foreground">Prevent abuse and DoS attacks</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-success" />
          </div>
        </div>
      </div>

      {/* Database */}
      <div className="space-y-4 pt-6 border-t border-border">
        <h3 className="font-semibold text-foreground">Database & Infrastructure</h3>

        <div className="bg-success/10 border border-success/20 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Database className="w-6 h-6 text-success" />
            <div>
              <p className="font-semibold text-success">Convex Backend (Self-Hosted)</p>
              <p className="text-sm text-success">Real-time database and serverless functions</p>
            </div>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground">Deployment URL</p>
            <p className="font-mono text-foreground">convex.toolboxhosting.com</p>
          </div>
        </div>
      </div>

      {/* Database Reset - DANGER ZONE */}
      <div className="space-y-4 pt-6 border-t-2 border-destructive">
        <h3 className="font-semibold text-destructive flex items-center gap-2">
          <Trash2 className="w-5 h-5" />
          Danger Zone - Database Reset
        </h3>

        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-sm text-destructive mb-4">
            <strong>WARNING:</strong> This will permanently delete ALL events, tickets, orders,
            ticket tiers, payment configs, and users (except thestepperslife@gmail.com).
            This action cannot be undone!
          </p>

          {resetResult && (
            <div className="bg-white rounded-lg p-4 mb-4 text-sm">
              <p className="font-semibold text-success mb-2">Reset Complete!</p>
              <ul className="space-y-1 text-foreground">
                <li>Events deleted: {resetResult.events}</li>
                <li>Tickets deleted: {resetResult.tickets}</li>
                <li>Orders deleted: {resetResult.orders}</li>
                <li>Ticket tiers deleted: {resetResult.ticketTiers}</li>
                <li>Payment configs deleted: {resetResult.paymentConfigs}</li>
                <li>Staff records deleted: {resetResult.staff}</li>
                <li>Bundles deleted: {resetResult.bundles}</li>
                <li>Users deleted: {resetResult.users}</li>
              </ul>
            </div>
          )}

          <div className="flex items-center gap-3">
            {confirmReset ? (
              <>
                <button
                  onClick={handleReset}
                  disabled={isResetting}
                  className="px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive/90 font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Yes, Delete Everything
                    </>
                  )}
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  disabled={isResetting}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive/90 font-medium flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Reset Database
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
