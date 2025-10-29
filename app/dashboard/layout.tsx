"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { TransactionSheet } from "@/components/sheets/transaction-sheet";
import { Suspense } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full">
      <Sidebar />

      <div className="flex flex-col flex-1 md:ml-[70px]">
        <Header />

        <main className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </main>
      </div>

      {/* Global sheets - wrapped in Suspense for SSR */}
      <Suspense fallback={null}>
        <TransactionSheet />
      </Suspense>
    </div>
  );
}
