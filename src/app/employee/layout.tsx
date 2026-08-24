"use client";

export const dynamic = "force-dynamic";

import EmployeeSidebar from "@/components/EmployeeSidebar";
import EmployeeBottomNav from "@/components/EmployeeBottomNav";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-transparent">
      <EmployeeSidebar />

      <main className="flex-1 w-full bg-transparent overflow-x-hidden md:ml-64 pb-[90px] md:pb-0">
        {children}
      </main>

      <EmployeeBottomNav />
    </div>
  );
}
