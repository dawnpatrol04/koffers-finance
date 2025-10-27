"use client";

import { useUser } from "@/contexts/user-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function UserMenu() {
  const { user } = useUser();

  if (!user) return null;

  return (
    <Avatar className="h-8 w-8 cursor-pointer">
      <AvatarFallback className="text-xs">
        {user.email?.[0]?.toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
