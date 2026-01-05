/**
 * Self-Service Seller Join Page
 *
 * Allows sellers to self-register via an invite link from a manager.
 * Flow:
 * 1. Manager generates invite code via staff dashboard
 * 2. Manager shares link: /join/INV-XXXXX
 * 3. Seller visits link, sees event info
 * 4. Seller fills out form and joins as SELLER under that manager
 */

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  UserPlus,
  Calendar,
  User,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Loader2,
  PartyPopper,
} from "lucide-react";
import { format } from "date-fns";

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const inviteCode = params.inviteCode as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{
    valid: boolean;
    error?: string;
    managerName?: string;
    eventId?: string;
    eventName?: string;
    eventDate?: number;
  } | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const getInviteInfo = useMutation(api.staff.mutations.getInviteCodeInfo);
  const joinViaInvite = useMutation(api.staff.mutations.joinViaInviteCode);

  // Fetch invite info on mount
  useEffect(() => {
    async function fetchInviteInfo() {
      try {
        const info = await getInviteInfo({ inviteCode });
        setInviteInfo(info);
      } catch (err) {
        setInviteInfo({ valid: false, error: "Failed to validate invite code" });
      } finally {
        setLoading(false);
      }
    }
    fetchInviteInfo();
  }, [inviteCode, getInviteInfo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await joinViaInvite({
        inviteCode,
        name,
        email,
        phone: phone || undefined,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to join. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Validating invite...</p>
        </div>
      </div>
    );
  }

  // Invalid invite
  if (!inviteInfo?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <XCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
            <CardTitle>Invalid Invite</CardTitle>
            <CardDescription>
              {inviteInfo?.error || "This invite link is not valid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" onClick={() => router.push("/")}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <PartyPopper className="w-16 h-16 mx-auto text-success mb-4" />
            <CardTitle>Welcome to the Team!</CardTitle>
            <CardDescription>
              You&apos;ve successfully joined as a seller for {inviteInfo.eventName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>
                Check your email at <strong>{email}</strong> for login instructions.
              </AlertDescription>
            </Alert>
            <div className="text-center">
              <Button onClick={() => router.push("/login")}>
                Sign In to Get Started
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Join form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <UserPlus className="w-12 h-12 mx-auto text-primary mb-4" />
          <CardTitle>Join as a Seller</CardTitle>
          <CardDescription>
            You&apos;ve been invited by <strong>{inviteInfo.managerName}</strong> to sell tickets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Event Info */}
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold text-lg mb-2">{inviteInfo.eventName}</h3>
            {inviteInfo.eventDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(inviteInfo.eventDate), "EEEE, MMMM d, yyyy")}</span>
              </div>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <XCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Join Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="pl-10"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join as Seller"
              )}
            </Button>
          </form>

          {/* Info Text */}
          <p className="text-xs text-muted-foreground text-center mt-4">
            By joining, you agree to sell tickets for this event and earn commission on your sales.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
