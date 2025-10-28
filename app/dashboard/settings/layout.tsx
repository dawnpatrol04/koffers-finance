import { SecondaryMenu } from "@/components/dashboard/secondary-menu";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[800px]">
      <SecondaryMenu
        items={[
          { path: "/dashboard/settings", label: "General" },
          { path: "/dashboard/settings/billing", label: "Billing" },
          { path: "/dashboard/settings/accounts", label: "Bank Connections" },
          { path: "/dashboard/settings/members", label: "Members" },
          { path: "/dashboard/settings/notifications", label: "Notifications" },
          { path: "/dashboard/settings/developer", label: "Developer" },
        ]}
      />

      <main className="mt-8">{children}</main>
    </div>
  );
}
