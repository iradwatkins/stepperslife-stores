"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, Edit, Trash2, Home, Briefcase } from "lucide-react";
import Link from "next/link";

export default function AddressesPage() {
  const currentUser = useQuery(api.users.queries.getCurrentUser);

  // Mock data - will be replaced with actual Convex query
  const addresses: any[] = [];

  const getAddressIcon = (type: string) => {
    switch (type) {
      case "home":
        return <Home className="h-4 w-4" />;
      case "work":
        return <Briefcase className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/user/profile" className="hover:text-foreground">
            Profile
          </Link>
          <span>/</span>
          <span>Saved Addresses</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Saved Addresses</h1>
        <p className="text-muted-foreground mt-2">
          Manage your saved addresses for faster checkout
        </p>
      </div>

      {/* Add New Address Button */}
      <Button>
        <Plus className="h-4 w-4 mr-2" />
        Add New Address
      </Button>

      {/* Addresses List */}
      {addresses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">No saved addresses</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add an address to make checkout faster
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Address
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address: any) => (
            <Card key={address.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded">
                      {getAddressIcon(address.type)}
                    </div>
                    <div>
                      <CardTitle className="text-base capitalize">
                        {address.type} Address
                      </CardTitle>
                      {address.isDefault && (
                        <span className="text-xs px-2 py-0.5 bg-success/10 text-success rounded">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{address.fullName}</p>
                  <p className="text-muted-foreground">{address.street}</p>
                  {address.apartment && (
                    <p className="text-muted-foreground">{address.apartment}</p>
                  )}
                  <p className="text-muted-foreground">
                    {address.city}, {address.state} {address.zipCode}
                  </p>
                  <p className="text-muted-foreground">{address.country}</p>
                  {address.phone && (
                    <p className="text-muted-foreground pt-2">{address.phone}</p>
                  )}
                </div>
                {!address.isDefault && (
                  <Button variant="outline" size="sm" className="w-full mt-4">
                    Set as Default
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
