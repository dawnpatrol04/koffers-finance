import { SecondaryMenu } from "@/components/secondary-menu";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-[800px] p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <SecondaryMenu
        items={[
          { path: "/dashboard/settings", label: "General" },
          { path: "/dashboard/settings/accounts", label: "Accounts" },
          { path: "/dashboard/settings/notifications", label: "Notifications" },
        ]}
      />

      <main className="mt-8">{children}</main>
    </div>
  );
}
