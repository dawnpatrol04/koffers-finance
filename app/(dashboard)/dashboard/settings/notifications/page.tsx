"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

export default function NotificationsSettings() {
  const [transactionAlerts, setTransactionAlerts] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);

  return (
    <div className="space-y-12">
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Manage your personal notification settings.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Transaction Alerts */}
          <div className="flex items-center justify-between space-x-2 border-b pb-4">
            <div className="space-y-0.5">
              <Label htmlFor="transaction-alerts" className="text-base">
                Transaction alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Get notified when a new transaction is detected
              </p>
            </div>
            <Switch
              id="transaction-alerts"
              checked={transactionAlerts}
              onCheckedChange={setTransactionAlerts}
            />
          </div>

          {/* Weekly Summary */}
          <div className="flex items-center justify-between space-x-2 border-b pb-4">
            <div className="space-y-0.5">
              <Label htmlFor="weekly-summary" className="text-base">
                Weekly summary
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive a weekly summary of your spending
              </p>
            </div>
            <Switch
              id="weekly-summary"
              checked={weeklySummary}
              onCheckedChange={setWeeklySummary}
            />
          </div>

          {/* Budget Alerts */}
          <div className="flex items-center justify-between space-x-2 border-b pb-4">
            <div className="space-y-0.5">
              <Label htmlFor="budget-alerts" className="text-base">
                Budget alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Get notified when you're close to your budget limit
              </p>
            </div>
            <Switch
              id="budget-alerts"
              checked={budgetAlerts}
              onCheckedChange={setBudgetAlerts}
            />
          </div>

          {/* Marketing Emails */}
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="marketing-emails" className="text-base">
                Marketing emails
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive updates about new features and tips
              </p>
            </div>
            <Switch
              id="marketing-emails"
              checked={marketingEmails}
              onCheckedChange={setMarketingEmails}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
