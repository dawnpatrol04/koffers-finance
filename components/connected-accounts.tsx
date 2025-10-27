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

export function ConnectedAccounts() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bank Accounts</CardTitle>
        <CardDescription>
          Manage bank accounts, update or connect new ones.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="text-sm text-muted-foreground">
          No bank accounts connected yet.
        </div>
      </CardContent>

      <CardFooter className="flex justify-end">
        <Button>Connect Account</Button>
      </CardFooter>
    </Card>
  );
}
