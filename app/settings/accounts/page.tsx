import { ConnectedAccounts } from "@/components/connected-accounts";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bank Connections | Koffers",
};

// Mark this page as dynamic since it requires auth
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <div className="space-y-12">
      <ConnectedAccounts />
    </div>
  );
}
