"use client";

import { useUser as useUserContext } from "@/contexts/user-context";

export function useUserQuery() {
  const { user } = useUserContext();

  return {
    data: user ? {
      id: user.$id,
      email: user.email,
      fullName: user.name || null,
      team: {
        id: "default-team", // Placeholder for now
        name: "Personal", // Placeholder for now
      },
    } : null,
    isLoading: false,
  };
}
