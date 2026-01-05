"use client";

import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/convex/_generated/api";
import {
  Users as UsersIcon,
  Search,
  Shield,
  Briefcase,
  User,
  Trash2,
  Calendar,
  ShoppingCart,
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ConfirmDialog, useConfirmDialog } from "@/components/ui/confirm-dialog";

export default function UsersManagementPage() {
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "organizer" | "user">("all");
  const [selectedUser, setSelectedUser] = useState<Id<"users"> | null>(null);

  const allUsers = useQuery(api.adminPanel.queries.getAllUsers, {});
  const searchResults = useQuery(
    api.adminPanel.queries.searchUsers,
    searchQuery.length > 0 ? { query: searchQuery } : "skip"
  );

  const updateUserRole = useMutation(api.adminPanel.mutations.updateUserRole);
  const deleteUser = useMutation(api.adminPanel.mutations.deleteUser);

  const displayUsers = searchQuery.length > 0 ? searchResults : allUsers;

  const filteredUsers = displayUsers?.filter((user) => {
    if (roleFilter === "all") return true;
    return user.role === roleFilter;
  });

  const handleRoleChange = async (userId: Id<"users">, newRole: "admin" | "organizer" | "user") => {
    try {
      await updateUserRole({ userId, role: newRole });
      toast.success("User role updated successfully");
    } catch (error: unknown) {
      toast.error(`Failed to update role: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleDeleteUser = async (userId: Id<"users">, userName?: string) => {
    if (!confirm(`Are you sure you want to delete ${userName || "this user"}?`)) {
      return;
    }
    try {
      await deleteUser({ userId });
      toast.success("User deleted successfully");
    } catch (error: unknown) {
      toast.error(`Failed to delete user: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Show loading while Convex auth is being resolved
  if (isAuthLoading) {
    return <LoadingSpinner fullPage text="Authenticating..." />;
  }

  // If auth completed but user is not authenticated, Convex queries will never return data
  // The admin layout should handle redirecting, but this is a safety net
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Authentication required to view this page.</p>
          <a href="/login?redirect=/admin/users" className="text-primary hover:underline">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  if (!filteredUsers) {
    return <LoadingSpinner fullPage text="Loading users..." />;
  }

  const stats = {
    total: allUsers?.length || 0,
    admins: allUsers?.filter((u) => u.role === "admin").length || 0,
    organizers: allUsers?.filter((u) => u.role === "organizer").length || 0,
    users: allUsers?.filter((u) => !u.role || u.role === "user").length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1">Manage all platform users and permissions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent text-primary rounded-full flex items-center justify-center">
              <UsersIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-destructive/10 text-destructive rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Admins</p>
              <p className="text-2xl font-bold text-foreground">{stats.admins}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent text-primary rounded-full flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Organizers</p>
              <p className="text-2xl font-bold text-foreground">{stats.organizers}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted text-muted-foreground rounded-full flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Regular Users</p>
              <p className="text-2xl font-bold text-foreground">{stats.users}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-card rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div className="w-full md:w-48">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins</option>
              <option value="organizer">Organizers</option>
              <option value="user">Regular Users</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <UsersIcon className="w-4 h-4" />
          <span>
            Showing {filteredUsers.length} {filteredUsers.length === 1 ? "user" : "users"}
          </span>
        </div>
      </div>

      {/* Users Table/Cards */}
      {filteredUsers.length === 0 ? (
        <div className="bg-card rounded-lg shadow-md text-center py-12">
          <UsersIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No users found</p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filteredUsers.map((user) => (
              <div key={user._id} className="bg-card rounded-lg shadow-md p-4 border border-border">
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      user.role === "admin"
                        ? "bg-destructive/10 text-destructive"
                        : user.role === "organizer"
                          ? "bg-accent text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {user.role === "admin" ? (
                      <Shield className="w-5 h-5" />
                    ) : user.role === "organizer" ? (
                      <Briefcase className="w-5 h-5" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{user.name || "Unnamed User"}</p>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                      user.role === "admin"
                        ? "bg-destructive/10 text-destructive"
                        : user.role === "organizer"
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-foreground"
                    }`}
                  >
                    {user.role || "user"}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{(user as any).eventCount || 0} events</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ShoppingCart className="w-4 h-4" />
                    <span>{(user as any).orderCount || 0} orders</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Joined {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "N/A"}
                </p>
                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <select
                    value={user.role || "user"}
                    onChange={(e) =>
                      handleRoleChange(
                        user._id,
                        e.target.value as "admin" | "organizer" | "user"
                      )
                    }
                    className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-card"
                  >
                    <option value="admin">Admin</option>
                    <option value="organizer">Organizer</option>
                    <option value="user">User</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(user._id, user.name || user.email)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    title="Delete user"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-card rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Activity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-muted">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              user.role === "admin"
                                ? "bg-destructive/10 text-destructive"
                                : user.role === "organizer"
                                  ? "bg-accent text-primary"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {user.role === "admin" ? (
                              <Shield className="w-5 h-5" />
                            ) : user.role === "organizer" ? (
                              <Briefcase className="w-5 h-5" />
                            ) : (
                              <User className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{user.name || "Unnamed User"}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === "admin"
                              ? "bg-destructive/10 text-destructive"
                              : user.role === "organizer"
                                ? "bg-accent text-accent-foreground"
                                : "bg-muted text-foreground"
                          }`}
                        >
                          {user.role || "user"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{(user as any).eventCount || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ShoppingCart className="w-4 h-4" />
                            <span>{(user as any).orderCount || 0}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={user.role || "user"}
                            onChange={(e) =>
                              handleRoleChange(
                                user._id,
                                e.target.value as "admin" | "organizer" | "user"
                              )
                            }
                            className="px-3 py-1.5 text-sm border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-card"
                          >
                            <option value="admin">Admin</option>
                            <option value="organizer">Organizer</option>
                            <option value="user">User</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user._id, user.name || user.email)}
                            className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
