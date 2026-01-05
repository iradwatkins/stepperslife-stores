"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  MessageSquare,
  Heart,
  Star,
  TrendingUp,
  TrendingDown,
  Phone,
  Mail,
  Globe,
  FileText,
  Calendar,
  Loader2,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useState } from "react";

type DateRange = "7d" | "30d" | "90d" | "all";

export default function ProviderAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const analytics = useQuery(api.services.analytics.getDashboardAnalytics, {
    dateRange,
  });

  // Loading state
  if (analytics === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No provider found
  if (analytics === null) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">
            Track your listing performance and customer engagement
          </p>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No service provider found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Complete your provider setup to access analytics
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { metrics, inquiryByType, viewSources, dailyData, provider } = analytics;

  const formatChange = (change: number) => {
    if (change > 0) {
      return (
        <span className="flex items-center text-green-600 text-sm">
          <ArrowUpRight className="h-3 w-3 mr-1" />
          +{change}%
        </span>
      );
    } else if (change < 0) {
      return (
        <span className="flex items-center text-red-600 text-sm">
          <ArrowDownRight className="h-3 w-3 mr-1" />
          {change}%
        </span>
      );
    }
    return <span className="text-muted-foreground text-sm">No change</span>;
  };

  // Simple bar chart renderer
  const maxValue = Math.max(...dailyData.map((d) => Math.max(d.views, d.inquiries)), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">
            Track your listing performance and customer engagement
          </p>
        </div>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalViews}</div>
            {formatChange(metrics.viewsChange)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inquiries</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalInquiries}</div>
            {formatChange(metrics.inquiriesChange)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Favorites</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalFavorites}</div>
            <p className="text-xs text-muted-foreground">Users who saved you</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">Views to inquiries</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Views & Inquiries Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Views & Inquiries Over Time</CardTitle>
            <CardDescription>Daily trends for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyData.length === 0 || dailyData.every((d) => d.views === 0 && d.inquiries === 0) ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No data for this period</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Simple bar chart */}
                <div className="flex items-end gap-1 h-[160px]">
                  {dailyData.slice(-14).map((day, i) => (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center gap-1"
                      title={`${day.date}: ${day.views} views, ${day.inquiries} inquiries`}
                    >
                      <div className="w-full flex gap-0.5 items-end h-[140px]">
                        <div
                          className="flex-1 bg-primary/60 rounded-t"
                          style={{
                            height: `${(day.views / maxValue) * 100}%`,
                            minHeight: day.views > 0 ? "4px" : "0",
                          }}
                        />
                        <div
                          className="flex-1 bg-green-500/60 rounded-t"
                          style={{
                            height: `${(day.inquiries / maxValue) * 100}%`,
                            minHeight: day.inquiries > 0 ? "4px" : "0",
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {i % 2 === 0 ? day.date : ""}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary/60 rounded" />
                    <span className="text-muted-foreground">Views</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500/60 rounded" />
                    <span className="text-muted-foreground">Inquiries</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inquiry Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Inquiry Types</CardTitle>
            <CardDescription>How customers are contacting you</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <InquiryTypeRow
                icon={Phone}
                label="Phone Clicks"
                count={inquiryByType.phone_click}
                total={metrics.totalInquiries}
              />
              <InquiryTypeRow
                icon={Mail}
                label="Email Clicks"
                count={inquiryByType.email_click}
                total={metrics.totalInquiries}
              />
              <InquiryTypeRow
                icon={Globe}
                label="Website Clicks"
                count={inquiryByType.website_click}
                total={metrics.totalInquiries}
              />
              <InquiryTypeRow
                icon={FileText}
                label="Contact Forms"
                count={inquiryByType.contact_form}
                total={metrics.totalInquiries}
              />
              <InquiryTypeRow
                icon={Calendar}
                label="Booking Requests"
                count={inquiryByType.booking_request}
                total={metrics.totalInquiries}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Traffic Sources */}
      <Card>
        <CardHeader>
          <CardTitle>Traffic Sources</CardTitle>
          <CardDescription>Where your profile views are coming from</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SourceCard label="Search" count={viewSources.search} total={metrics.totalViews} />
            <SourceCard label="Category" count={viewSources.category} total={metrics.totalViews} />
            <SourceCard label="Direct" count={viewSources.direct} total={metrics.totalViews} />
            <SourceCard label="Referral" count={viewSources.referral} total={metrics.totalViews} />
            <SourceCard label="Other" count={viewSources.other} total={metrics.totalViews} />
          </div>
        </CardContent>
      </Card>

      {/* Reviews Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Reviews</CardTitle>
            <CardDescription>Your customer feedback summary</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/service-provider/dashboard/reviews">View All Reviews</a>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />
              <div>
                <div className="text-3xl font-bold">
                  {provider.averageRating > 0 ? provider.averageRating.toFixed(1) : "—"}
                </div>
                <div className="text-sm text-muted-foreground">Average rating</div>
              </div>
            </div>
            <div className="h-12 border-l" />
            <div>
              <div className="text-3xl font-bold">{metrics.totalReviews}</div>
              <div className="text-sm text-muted-foreground">Total reviews</div>
            </div>
            <div className="h-12 border-l" />
            <div>
              <div className="text-3xl font-bold">{metrics.recentReviewsCount}</div>
              <div className="text-sm text-muted-foreground">Recent reviews</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper Components
function InquiryTypeRow({
  icon: Icon,
  label,
  count,
  total,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  total: number;
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="flex items-center gap-4">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-sm text-muted-foreground">{count}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function SourceCard({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="p-4 bg-muted/50 rounded-lg">
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-xs text-muted-foreground mt-1">{percentage}% of total</div>
    </div>
  );
}
