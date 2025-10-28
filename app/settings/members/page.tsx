import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Members | Koffers",
};

export default function MembersSettings() {
  return (
    <div className="space-y-12">
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Manage team members and their permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Team member management coming soon.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
