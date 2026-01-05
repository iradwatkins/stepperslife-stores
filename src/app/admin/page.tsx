"use client";

import { useQuery } from "convex/react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/convex/_generated/api";
import {
  Users,
  Calendar,
  DollarSign,
  Ticket,
  TrendingUp,
  Activity,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { format } from "date-fns";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function AdminDashboard() {
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const analytics = useQuery(api.adminPanel.queries.getPlatformAnalytics, {});
  const recentActivity = useQuery(api.adminPanel.queries.getRecentActivity, {});

  // Show loading while Convex auth is being resolved
  if (isAuthLoading) {
    return <LoadingSpinner fullPage text="Authenticating..." />;
  }

  // If auth completed but user is not authenticated, Convex queries will never return data
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Authentication required to view this page.</p>
          <a href="/login?redirect=/admin" className="text-primary hover:underline">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  // If Convex auth is resolved and data is still null, show loading for data
  if (!analytics || !recentActivity) {
    return <LoadingSpinner fullPage text="Loading dashboard..." />;
  }

  const stats = [
    {
      name: "Total Users",
      value: analytics.users.total,
      subtext: `${analytics.users.organizers} organizers`,
      icon: Users,
      color: "blue",
      change: `+${analytics.users.recentSignups} this week`,
    },
    {
      name: "Total Events",
      value: analytics.events.total,
      subtext: `${analytics.events.published} published`,
      icon: Calendar,
      color: "blue",
      change: `+${analytics.events.recentCreated} this week`,
    },
    {
      name: "Platform Revenue",
      value: `$${(analytics.revenue.platformRevenue / 100).toFixed(2)}`,
      subtext: "from platform fees",
      icon: DollarSign,
      color: "green",
      change: `${analytics.orders.total} total orders`,
    },
    {
      name: "Tickets Sold",
      value: analytics.tickets.total,
      subtext: `${analytics.tickets.scanRate.toFixed(1)}% scan rate`,
      icon: Ticket,
      color: "orange",
      change: `${analytics.tickets.scanned} scanned`,
    },
  ];

  const revenueStats = [
    {
      name: "Gross Merchandise Value",
      value: `$${(analytics.revenue.gmv / 100).toLocaleString()}`,
      description: "Total revenue across all events",
    },
    {
      name: "Average Order Value",
      value: `$${(analytics.revenue.averageOrderValue / 100).toFixed(2)}`,
      description: "Average per transaction",
    },
    {
      name: "Platform Commission",
      value: `$${(analytics.revenue.platformRevenue / 100).toLocaleString()}`,
      description: "Total platform fees collected",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Platform Overview</h1>
        <p className="text-muted-foreground mt-1">Real-time platform analytics and system health</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: "bg-accent text-primary",
            green: "bg-success/10 text-success",
            orange: "bg-warning/10 text-warning",
          }[stat.color];

          return (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 ${colorClasses} rounded-full flex items-center justify-center`}
                >
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-1">{stat.name}</p>
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {stat.change}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Revenue Stats */}
      <div className="bg-primary rounded-lg shadow-md p-6 text-white">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <DollarSign className="w-6 h-6" />
          Revenue Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {revenueStats.map((stat) => (
            <div key={stat.name}>
              <p className="text-primary-foreground/80 text-sm mb-1">{stat.name}</p>
              <p className="text-3xl font-bold mb-1">{stat.value}</p>
              <p className="text-primary-foreground/80 text-xs">{stat.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Event Moderation Quick Access */}
      <div className="bg-card rounded-lg shadow-md">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Event Moderation
          </h2>
        </div>
        <div className="p-6">
          <p className="text-muted-foreground mb-4">
            Manage and moderate all platform events, update statuses, and review event content.
          </p>
          <Link
            href="/admin/events"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Calendar className="w-5 h-5" />
            Go to Event Moderation
          </Link>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-card rounded-lg shadow-md">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Orders
          </h2>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-border">
          {recentActivity.orders.slice(0, 10).map((order) => (
            <div key={order._id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-mono text-sm text-foreground">{order._id.slice(0, 8)}...</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(order.createdAt), "MMM d, h:mm a")}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    order.status === "COMPLETED"
                      ? "bg-success/10 text-success"
                      : order.status === "PENDING"
                        ? "bg-warning/10 text-warning"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {order.status === "COMPLETED" && <CheckCircle2 className="w-3 h-3" />}
                  {order.status}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground mb-1 truncate">{order.eventName}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{order.buyerName}</span>
                <span className="font-medium text-foreground">${(order.totalCents / 100).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentActivity.orders.slice(0, 10).map((order) => (
                <tr key={order._id} className="hover:bg-muted">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">
                    {order._id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">{order.eventName}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{order.buyerName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    ${(order.totalCents / 100).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === "COMPLETED"
                          ? "bg-success/10 text-success"
                          : order.status === "PENDING"
                            ? "bg-warning/10 text-warning"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {order.status === "COMPLETED" && <CheckCircle2 className="w-3 h-3" />}
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {format(new Date(order.createdAt), "MMM d, h:mm a")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/users"
          className="bg-card border-2 border-border rounded-lg p-6 hover:border-primary transition-colors"
        >
          <Users className="w-8 h-8 text-primary mb-3" />
          <h3 className="font-semibold text-foreground mb-1">Manage Users</h3>
          <p className="text-sm text-muted-foreground">View and moderate all platform users</p>
        </Link>

        <Link
          href="/admin/events"
          className="bg-card border-2 border-border rounded-lg p-6 hover:border-primary transition-colors"
        >
          <Calendar className="w-8 h-8 text-primary mb-3" />
          <h3 className="font-semibold text-foreground mb-1">Manage Events</h3>
          <p className="text-sm text-muted-foreground">Moderate and manage all events</p>
        </Link>

        <Link
          href="/admin/orders"
          className="bg-card border-2 border-border rounded-lg p-6 hover:border-primary transition-colors"
        >
          <Ticket className="w-8 h-8 text-primary mb-3" />
          <h3 className="font-semibold text-foreground mb-1">View Orders</h3>
          <p className="text-sm text-muted-foreground">Manage ticket orders and transactions</p>
        </Link>
      </div>
    </div>
  );
}
