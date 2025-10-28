"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function CompanyCountry() {
  const [country, setCountry] = useState("US");

  const handleSave = () => {
    // Placeholder - will connect to Appwrite later
    console.log("Save company country:", country);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company country</CardTitle>
        <CardDescription>
          This is your company's country. It will be used for invoices and tax
          calculations.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="max-w-[300px]">
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="US">United States</SelectItem>
            <SelectItem value="CA">Canada</SelectItem>
            <SelectItem value="GB">United Kingdom</SelectItem>
            <SelectItem value="DE">Germany</SelectItem>
            <SelectItem value="FR">France</SelectItem>
            <SelectItem value="AU">Australia</SelectItem>
            <SelectItem value="NZ">New Zealand</SelectItem>
          </SelectContent>
        </Select>
      </CardContent>

      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          Select your company's primary operating country.
        </div>
        <Button onClick={handleSave}>Save</Button>
      </CardFooter>
    </Card>
  );
}
