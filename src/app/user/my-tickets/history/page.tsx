"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Ticket, Calendar, Download, Search, DollarSign, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface Transaction {
  id: string;
  eventName: string;
  transactionId: string;
  date: number;
  quantity: number;
  amount: number;
  status: "completed" | "refunded" | "cancelled" | string;
}

export default function TicketHistoryPage() {
  const currentUser = useQuery(api.users.queries.getCurrentUser);
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data - will be replaced with actual Convex query
  const transactions: Transaction[] = [];

  const filteredTransactions = transactions.filter((transaction) =>
    transaction.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.transactionId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-success/20 text-success">
            <CheckCircle className="h-3 w-3" />
            Completed
          </span>
        );
      case "refunded":
        return (
          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-info/20 text-foreground">
            <Download className="h-3 w-3" />
            Refunded
          </span>
        );
      case "cancelled":
        return (
          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-destructive/20 text-destructive">
            <XCircle className="h-3 w-3" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-muted text-foreground">
            {status}
          </span>
        );
    }
  };

  const totalSpent = transactions.reduce(
    (sum, t) => sum + (t.status === "completed" ? t.amount : 0),
    0
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/user/my-tickets" className="hover:text-foreground">
            My Tickets
          </Link>
          <span>/</span>
          <span>Ticket History</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Ticket History</h1>
        <p className="text-muted-foreground mt-2">
          Complete history of all ticket purchases and transactions
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold mt-1">{transactions.length}</p>
              </div>
              <Ticket className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold mt-1">${totalSpent.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tickets</p>
                <p className="text-2xl font-bold mt-1">
                  {transactions.reduce((sum, t) => sum + t.quantity, 0)}
                </p>
              </div>
              <Ticket className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by event or transaction ID..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Transaction History */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Transaction History</h2>
        {filteredTransactions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">
                {searchTerm ? "No transactions found" : "No transactions yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {searchTerm
                  ? "Try adjusting your search"
                  : "Your ticket purchase history will appear here"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredTransactions.map((transaction) => (
                <Card key={transaction.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-foreground">{transaction.eventName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(transaction.date)}
                        </p>
                      </div>
                      {getStatusBadge(transaction.status)}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mb-3 truncate">
                      {transaction.transactionId}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {transaction.quantity} ticket{transaction.quantity !== 1 ? "s" : ""}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          ${transaction.amount.toFixed(2)}
                        </span>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop Table View */}
            <Card className="hidden md:block">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-medium text-sm">Date</th>
                        <th className="text-left p-4 font-medium text-sm">Event</th>
                        <th className="text-left p-4 font-medium text-sm">Transaction ID</th>
                        <th className="text-right p-4 font-medium text-sm">Quantity</th>
                        <th className="text-right p-4 font-medium text-sm">Amount</th>
                        <th className="text-center p-4 font-medium text-sm">Status</th>
                        <th className="text-right p-4 font-medium text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((transaction, index) => (
                        <tr key={transaction.id} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                          <td className="p-4 text-sm">
                            {formatDate(transaction.date)}
                          </td>
                          <td className="p-4 text-sm font-medium">
                            {transaction.eventName}
                          </td>
                          <td className="p-4 text-sm text-muted-foreground font-mono">
                            {transaction.transactionId}
                          </td>
                          <td className="p-4 text-sm text-right">
                            {transaction.quantity}
                          </td>
                          <td className="p-4 text-sm text-right font-medium">
                            ${transaction.amount.toFixed(2)}
                          </td>
                          <td className="p-4 text-center">
                            {getStatusBadge(transaction.status)}
                          </td>
                          <td className="p-4 text-right">
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
