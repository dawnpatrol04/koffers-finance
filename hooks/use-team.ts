"use client";

import { teams, getTeamPrefs, updateTeamPrefs, type TeamPrefs } from "@/lib/appwrite-client";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

const TEAM_QUERY_KEY = ["team", "current"];

export function useTeamQuery() {
  return useSuspenseQuery({
    queryKey: TEAM_QUERY_KEY,
    queryFn: async () => {
      try {
        // Get user's teams
        const teamsList = await teams.list();

        let team;

        // Auto-create a team if none exists
        if (teamsList.total === 0) {
          console.log("No team found, creating default team...");
          team = await teams.create(
            "default-team-" + Date.now(),
            "My Company"
          );
        } else {
          team = teamsList.teams[0];
        }

        // Get team preferences (company data)
        const prefs = await getTeamPrefs(team.$id);

        return {
          id: team.$id,
          name: prefs.name || team.name,
          email: prefs.email || "",
          logoUrl: prefs.logoUrl || null,
          country: prefs.country || null,
          countryCode: prefs.countryCode || "",
          baseCurrency: prefs.baseCurrency || "USD",
        };
      } catch (error) {
        console.error("Error fetching team:", error);
        throw error;
      }
    },
  });
}

export function useTeamMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newData: Partial<TeamPrefs>) => {
      // Get current team data
      const currentTeam = queryClient.getQueryData<{
        id: string;
        name?: string;
        email?: string;
        logoUrl?: string | null;
        country?: string | null;
        countryCode?: string;
        baseCurrency?: string;
      }>(TEAM_QUERY_KEY);

      if (!currentTeam) {
        throw new Error("No team found");
      }

      // Update team preferences
      await updateTeamPrefs(currentTeam.id, newData);

      return { ...currentTeam, ...newData };
    },
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: TEAM_QUERY_KEY });

      // Get current data
      const previousData = queryClient.getQueryData(TEAM_QUERY_KEY);

      // Optimistically update
      queryClient.setQueryData(TEAM_QUERY_KEY, (old: any) => ({
        ...old,
        ...newData,
      }));

      return { previousData };
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(TEAM_QUERY_KEY, context.previousData);
      }
    },
    onSettled: () => {
      // Refetch after error or success
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEY });
    },
  });
}
