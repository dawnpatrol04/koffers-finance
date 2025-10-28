import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Developer | Koffers",
};

export default function DeveloperSettings() {
  return (
    <div className="space-y-12">
      <Card>
        <CardHeader>
          <CardTitle>Developer</CardTitle>
          <CardDescription>
            Manage API keys and developer settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Developer settings coming soon.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
