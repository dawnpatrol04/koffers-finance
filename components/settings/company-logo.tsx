"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function CompanyLogo() {
  const handleUpload = () => {
    // Placeholder - will connect to Appwrite later
    console.log("Upload logo clicked");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company logo</CardTitle>
        <CardDescription>
          This is your company's logo. It will be displayed on invoices and
          other documents.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src="" alt="Company logo" />
            <AvatarFallback className="text-2xl">K</AvatarFallback>
          </Avatar>
          <Button type="button" variant="outline" onClick={handleUpload}>
            Upload logo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
