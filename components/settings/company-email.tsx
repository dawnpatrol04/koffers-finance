"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function CompanyEmail() {
  const [email, setEmail] = useState("contact@koffers.com");

  const handleSave = () => {
    // Placeholder - will connect to Appwrite later
    console.log("Save company email:", email);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company email</CardTitle>
        <CardDescription>
          This is your company's email address. It will be displayed on
          invoices and other documents.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="max-w-[300px]"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
        />
      </CardContent>

      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          This email will be used for company communications.
        </div>
        <Button onClick={handleSave}>Save</Button>
      </CardFooter>
    </Card>
  );
}
