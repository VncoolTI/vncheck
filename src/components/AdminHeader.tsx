"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  UserCircleIcon, 
  ChevronDownIcon, 
  ArrowRightOnRectangleIcon,
  ExclamationTriangleIcon 
} from "@heroicons/react/24/solid";

export default function AdminHeader() {
  const supabase = createClient();
  const router = useRouter();
  
  const [userData, setUserData] = useState({
    name: "Loading...",
    role: "...",
    avatar_url: null as string | null
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // 1. Fungsi Fetch Data (Gunakan useCallback agar stabil)
  const fetchUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: emp } = await supabase
          .from("employees")
          .select("full_name, role, avatar_url") 
          .eq("id", user.id)
          .single();

      let displayRole = "Staff";
      if (emp?.role === 'super_admin') displayRole = "Super Admin";
      if (emp?.role === 'admin') displayRole = "HR Admin";

      setUserData({
          name: emp?.full_name || user.user_metadata.full_name || "User",
          role: displayRole,
          avatar_url: emp?.avatar_url || null
      });
    }
  }, [supabase]);

  // 2. Effect: Load Awal + Dengar Sinyal Update
  useEffect(() => {
    // A. Load data saat pertama kali buka
    fetchUser(); 

    // B. Siapkan fungsi jika ada sinyal 'profile-updated'
    const handleProfileUpdate = () => {
        console.log("Sinyal diterima: Profile berubah, mengambil data baru...");
        fetchUser(); // Ambil data ulang
    };

    // C. Pasang "Telinga" (Event Listener)
    window.addEventListener('profile-updated', handleProfileUpdate);

    // D. Bersihkan saat komponen hilang (Cleanup)
    return () => {
        window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, [fetchUser]);

  const handleLogoutClick = () => {
    setIsDropdownOpen(false); 
    setShowLogoutModal(true); 
  };

  const handleConfirmLogout = async () => {
    try {
        await supabase.auth.signOut();
        router.replace("/login");
        router.refresh();
    } catch (error) {
        console.error("Logout error", error);
        router.replace("/login");
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8 shadow-sm sticky top-0 z-40">
      
      <div className="relative">
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-lg transition-colors outline-none focus:ring-2 focus:ring-gray-100"
        >
          {/* Avatar Circle */}
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 text-gray-400 relative">
             {userData.avatar_url ? (
                 <Image 
                    src={userData.avatar_url} 
                    alt="Avatar" 
                    fill 
                    className="object-cover"
                 />
             ) : (
                 <UserCircleIcon className="w-12 h-12 mt-2" />
             )}
          </div>
          
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-gray-800 leading-none">{userData.name}</p>
            <p className="text-xs text-gray-500 mt-1">{userData.role}</p>
          </div>

          <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                <div className="px-4 py-3 border-b border-gray-100 md:hidden">
                    <p className="text-sm font-bold text-gray-900">{userData.name}</p>
                    <p className="text-xs text-gray-500">{userData.role}</p>
                </div>
                <button
                    onClick={handleLogoutClick}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors font-medium"
                >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    Sign Out
                </button>
            </div>
        )}

        {isDropdownOpen && (
            <div className="fixed inset-0 z-[-1]" onClick={() => setIsDropdownOpen(false)} />
        )}
      </div>

      {showLogoutModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100 text-center relative">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                    <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Sign Out?</h3>
                <p className="text-sm text-gray-500 mb-6 px-4">
                    Are you sure you want to sign out? You will need to log in again to access the dashboard.
                </p>
                <div className="flex gap-3 justify-center">
                    <button onClick={() => setShowLogoutModal(false)} className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold">Cancel</button>
                    <button onClick={handleConfirmLogout} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md">Yes, Sign Out</button>
                </div>
            </div>
        </div>
      )}
    </header>
  );
}