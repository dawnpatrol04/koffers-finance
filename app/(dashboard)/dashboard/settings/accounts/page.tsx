import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AccountsSettings() {
  return (
    <div className="space-y-12">
      <Card>
        <CardHeader>
          <CardTitle>Connected accounts</CardTitle>
          <CardDescription>
            Connect your bank accounts to automatically import transactions and
            track your finances.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="border border-dashed rounded-lg p-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              No accounts connected yet
            </p>
            <Button>Connect account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
