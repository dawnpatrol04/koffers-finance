import { ProtectedRoute } from "@/components/auth/protected-route";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="relative">
        <Sidebar />

        <div className="md:ml-[70px] pb-8">
          <Header />
          <div className="px-6">{children}</div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
