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

export function CompanyName() {
  const [name, setName] = useState("Koffers");

  const handleSave = () => {
    // Placeholder - will connect to Appwrite later
    console.log("Save company name:", name);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company name</CardTitle>
        <CardDescription>
          This is your company's visible name within Koffers. For example, the
          name of your company or department.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-[300px]"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
          maxLength={32}
        />
      </CardContent>

      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          Please use 32 characters at maximum.
        </div>
        <Button onClick={handleSave}>Save</Button>
      </CardFooter>
    </Card>
  );
}
