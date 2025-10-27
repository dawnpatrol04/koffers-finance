"use client";

import { useTeamMutation, useTeamQuery } from "@/hooks/use-team";
import {
  Card,
  CardContent,
  CardDescription,
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
import { uniqueCurrencies } from "@/lib/currencies";

export function BaseCurrency() {
  const { data: team } = useTeamQuery();
  const updateTeamMutation = useTeamMutation();

  const handleChange = (baseCurrency: string) => {
    updateTeamMutation.mutate({
      baseCurrency: baseCurrency.toUpperCase(),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Base currency</CardTitle>
        <CardDescription>
          If you have multiple currencies, you can set a base currency for your
          account to view your total balance in your preferred currency.
          Exchange rates are updated every 24 hours.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="w-[200px]">
          <Select
            value={team?.baseCurrency ?? "USD"}
            onValueChange={handleChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {uniqueCurrencies.map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
