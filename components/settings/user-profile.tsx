"use client";

import { useUser } from "@/contexts/user-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function UserProfile() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500">Not logged in</div>
        </CardContent>
      </Card>
    );
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
        <CardDescription>Your personal information and account details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar and Name */}
        <div className="flex items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Name</div>
            <div className="text-lg font-semibold">{user.name || "Not set"}</div>
          </div>
        </div>

        {/* Email */}
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-1">Email</div>
          <div className="text-sm">{user.email}</div>
          {user.emailVerification && (
            <div className="text-xs text-green-600 mt-1">✓ Verified</div>
          )}
          {!user.emailVerification && (
            <div className="text-xs text-amber-600 mt-1">Not verified</div>
          )}
        </div>

        {/* User ID */}
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-1">User ID</div>
          <div className="text-xs font-mono text-muted-foreground">{user.$id}</div>
        </div>

        {/* Account Created */}
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-1">Member Since</div>
          <div className="text-sm">
            {new Date(user.$createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
