"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  HomeIcon, 
  UsersIcon, 
  ClockIcon, 
  CalendarDaysIcon, 
  BriefcaseIcon,
  ClipboardDocumentCheckIcon,
  BanknotesIcon,
  Cog6ToothIcon
} from "@heroicons/react/24/solid";

const menuItems = [
  { name: "Home", icon: HomeIcon, href: "/admin/dashboard" },
  { name: "Employee", icon: UsersIcon, href: "/admin/employee" },
  { name: "Attendance", icon: ClockIcon, href: "/admin/attendance" },
  { name: "Leave", icon: CalendarDaysIcon, href: "/admin/leave" },
  { name: "Overtime", icon: BriefcaseIcon, href: "/admin/overtime" },
  { name: "Task", icon: ClipboardDocumentCheckIcon, href: "/admin/task" },
  { name: "Payslip", icon: BanknotesIcon, href: "/admin/payslip" },
  { name: "Setting", icon: Cog6ToothIcon, href: "/admin/setting" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#E9EDF5] flex-shrink-0 flex flex-col border-r border-gray-200 h-screen fixed left-0 top-0 z-50">
      
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 bg-white border-b border-gray-200">
        <h1 className="text-2xl font-extrabold text-[#007CC2]">VNCHECK</h1>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 py-6 space-y-1 px-4 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-all group ${
                isActive
                  ? "bg-[#5D9CEC] text-white shadow-sm" // Active State (Biru Muda)
                  : "text-gray-500 hover:bg-white hover:text-gray-700 hover:shadow-sm"
              }`}
            >
              <item.icon className={`w-5 h-5 mr-3 ${isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}