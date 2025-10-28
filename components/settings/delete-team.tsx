"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DeleteTeam() {
  const handleDelete = () => {
    // Placeholder - will add confirmation dialog and Appwrite integration later
    console.log("Delete team clicked");
  };

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle>Delete team</CardTitle>
        <CardDescription>
          Permanently delete this team and all of its data. This action cannot
          be undone.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground">
          Once you delete a team, there is no going back. Please be certain.
        </p>
      </CardContent>

      <CardFooter>
        <Button variant="destructive" onClick={handleDelete}>
          Delete team
        </Button>
      </CardFooter>
    </Card>
  );
}
