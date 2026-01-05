"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Ticket,
  MapPin,
  Trophy,
  Star,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import Link from "next/link";

interface EventPassportProps {
  userId?: Id<"users">; // If provided, shows public passport; otherwise shows current user's
}

interface Achievement {
  code: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
}

function PassportSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-24" />
      </CardContent>
    </Card>
  );
}

function AchievementBadge({
  achievement,
  unlocked,
}: {
  achievement: {
    code: string;
    name: string;
    description: string;
    icon: string;
    tier: string;
  };
  unlocked: boolean;
}) {
  const tierColors = {
    bronze: "bg-amber-600/20 text-amber-600 border-amber-600/30",
    silver: "bg-gray-400/20 text-gray-500 border-gray-400/30",
    gold: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
    platinum: "bg-purple-500/20 text-purple-500 border-purple-500/30",
  };

  return (
    <div
      className={`relative p-3 rounded-lg border transition-all ${
        unlocked
          ? tierColors[achievement.tier as keyof typeof tierColors]
          : "bg-muted/30 text-muted-foreground/50 border-muted grayscale"
      }`}
      title={unlocked ? achievement.description : `${achievement.name} - Locked`}
    >
      <div className="text-2xl mb-1">{achievement.icon}</div>
      <p className="text-xs font-medium truncate">{achievement.name}</p>
      {!unlocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg">
          <span className="text-lg">🔒</span>
        </div>
      )}
    </div>
  );
}

export function EventPassport({ userId }: EventPassportProps) {
  // Fetch passport based on whether we're viewing own or someone else's
  const ownPassport = useQuery(
    api.passport.queries.getPassport,
    userId ? "skip" : {}
  );
  const publicPassport = useQuery(
    api.passport.queries.getPublicPassport,
    userId ? { userId } : "skip"
  );
  const allAchievements = useQuery(api.passport.queries.getAllAchievements, {});

  const passport = userId ? publicPassport : ownPassport;
  const isOwnPassport = !userId;

  // Loading
  if (passport === undefined || allAchievements === undefined) {
    return <PassportSkeleton />;
  }

  // No passport yet
  if (!passport) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Ticket className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-medium mb-2">No Passport Yet</h3>
          <p className="text-sm text-muted-foreground">
            {isOwnPassport
              ? "Attend your first event to start your stepping passport!"
              : "This stepper hasn't attended any events yet."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const unlockedCodes = new Set(passport.achievements || []);

  // Calculate next milestone
  const nextMilestone =
    passport.eventsAttended < 5
      ? { target: 5, label: "Regular" }
      : passport.eventsAttended < 25
        ? { target: 25, label: "Dedicated Stepper" }
        : passport.eventsAttended < 100
          ? { target: 100, label: "Century Club" }
          : null;

  return (
    <Card className="overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary/20">
            <AvatarImage src={passport.userImage} />
            <AvatarFallback className="text-xl">
              {(passport.userName || "S").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold">
              {passport.userName || "Stepper"}&apos;s Passport
            </h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Ticket className="h-4 w-4" />
              {passport.eventsAttended} event{passport.eventsAttended !== 1 ? "s" : ""} attended
            </p>
          </div>
        </div>
      </div>

      <CardContent className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {passport.eventsAttended}
            </div>
            <div className="text-xs text-muted-foreground">Events</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {passport.uniqueCities?.length || 0}
            </div>
            <div className="text-xs text-muted-foreground">Cities</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {passport.uniqueStates?.length || 0}
            </div>
            <div className="text-xs text-muted-foreground">States</div>
          </div>
        </div>

        {/* Progress to next milestone */}
        {nextMilestone && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Progress to {nextMilestone.label}
              </span>
              <span className="font-medium">
                {passport.eventsAttended} / {nextMilestone.target}
              </span>
            </div>
            <Progress
              value={(passport.eventsAttended / nextMilestone.target) * 100}
              className="h-2"
            />
          </div>
        )}

        {/* Cities Visited */}
        {passport.uniqueCities && passport.uniqueCities.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Cities Visited
            </h3>
            <div className="flex flex-wrap gap-2">
              {passport.uniqueCities.slice(0, 10).map((city) => (
                <Badge key={city} variant="secondary" className="text-xs">
                  {city}
                </Badge>
              ))}
              {passport.uniqueCities.length > 10 && (
                <Badge variant="outline" className="text-xs">
                  +{passport.uniqueCities.length - 10} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Achievements */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              Achievements
            </h3>
            <span className="text-xs text-muted-foreground">
              {passport.achievements?.length || 0} / {allAchievements?.length || 0} unlocked
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {allAchievements?.slice(0, 12).map((achievement) => (
              <AchievementBadge
                key={achievement.code}
                achievement={achievement}
                unlocked={unlockedCodes.has(achievement.code)}
              />
            ))}
          </div>

          {allAchievements && allAchievements.length > 12 && (
            <Link
              href="/user/achievements"
              className="flex items-center justify-center gap-1 text-sm text-primary hover:underline mt-3"
            >
              View all achievements
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {/* First event date */}
        {"firstEventDate" in passport && passport.firstEventDate && (
          <div className="pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Stepping since{" "}
              <span className="font-medium">
                {format(new Date(passport.firstEventDate as number), "MMMM yyyy")}
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Mini version for displaying on event pages or profiles
export function EventPassportMini({ userId }: EventPassportProps) {
  const passport = useQuery(
    api.passport.queries.getPublicPassport,
    userId ? { userId } : "skip"
  );

  if (!passport || !userId) return null;

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
      <Avatar className="h-10 w-10">
        <AvatarImage src={passport.userImage} />
        <AvatarFallback>
          {(passport.userName || "S").charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{passport.userName}</p>
        <p className="text-xs text-muted-foreground">
          {passport.eventsAttended} events • {passport.uniqueCities?.length || 0} cities
        </p>
      </div>
      {passport.achievements && passport.achievements.length > 0 && (
        <div className="flex -space-x-1">
          {(passport.unlockedAchievements as Achievement[] | undefined)?.slice(0, 3).map((a) => (
            a && (
              <span
                key={a.code}
                className="text-lg"
                title={a.name}
              >
                {a.icon}
              </span>
            )
          ))}
        </div>
      )}
    </div>
  );
}
