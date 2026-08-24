"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronLeftIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  UserCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";

// Definisi tipe data Payslip sesuai schema database
type Payslip = {
  id: number;
  user_id: string;
  month: number;
  year: number;
  file_path: string;
  created_at: string;
};

// Helper untuk mengubah angka bulan menjadi nama bulan
const getMonthName = (monthNumber: number) => {
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return months[monthNumber - 1] || "Bulan Tidak Valid";
};

export default function PayslipPage() {
  const supabase = createClient();
  const router = useRouter();

  // --- STATE ---
  const [user, setUser] = useState<any>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState<number | null>(null);
  const [errorModal, setErrorModal] = useState({ show: false, message: "" });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // --- 1. CHECK USER & FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push("/");
        return;
      }
      setUser(user);

      // Ambil data payslip, urutkan dari tahun dan bulan terbaru
      const { data, error } = await supabase
        .from("payslips")
        .select("*")
        .eq("user_id", user.id)
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (error) {
        console.error("Error fetching payslips:", error.message);
      } else {
        setPayslips(data as Payslip[]);
      }
      setIsLoading(false);

      const { data: employeeData } = await supabase
        .from("employees")
        .select("avatar_url")
        .eq("id", user.id)
        .single();

      if (employeeData) {
        setAvatarUrl(employeeData.avatar_url);
      }
    };

    fetchData();
  }, [router, supabase]);

  // --- 2. HANDLE DOWNLOAD / VIEW FILE ---
  const handleDownload = async (id: number, filePath: string) => {
    setIsDownloading(id);
    try {
      // PERHATIAN: Ganti 'payslips_bucket' dengan nama bucket Storage yang digunakan Admin
      const { data, error } = await supabase.storage
        .from("payslips_bucket")
        .createSignedUrl(filePath, 60); // URL valid selama 60 detik

      if (error) throw error;

      // Buka file di tab baru (bisa didownload dari sana)
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (error: any) {
      setErrorModal({
        show: true,
        message: "Gagal membuka file. Pastikan file masih tersedia di server.",
      });
    } finally {
      setIsDownloading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA]">
        <span className="loading loading-spinner text-[#007CC2] w-12 h-12 mb-4"></span>
        <p className="text-gray-500 font-medium">Memuat data slip gaji...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-vn-primary to-vn-secondary dark:bg-linear-to-b dark:from-[#001B48] dark:to-[#3B7CDE] text-gray-800 relative pb-24 md:pb-12">
      {/* --- HEADER --- */}
      <div className="bg-vn-primary dark:bg-[#001436] p-4 flex justify-between items-center sticky top-0 z-10 shadow-sm transition-colors duration-200">
        <button
          onClick={() => router.back()}
          className="flex items-center text-white dark:text-white hover:text-blue-600 dark:hover:text-gray-300 transition-colors"
        >
          <ChevronLeftIcon className="w-5 h-5 mr-1" />
          <span className="font-medium">Back</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="hidden md:block text-sm font-bold text-gray-500 uppercase tracking-widest">
            My Payslips
          </span>
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shadow-sm border border-gray-100 relative">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Profile"
                fill
                className="object-cover"
              />
            ) : (
              <UserCircleIcon className="w-full h-full text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="p-4 md:p-8 md:max-w-4xl md:mx-auto w-full mt-2 md:mt-6 animate-in fade-in duration-300">
        <div className="mb-6 md:mb-8 text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-black text-white drop-shadow-sm">
            Slip Gaji
          </h2>
          <p className="text-gray-200 text-sm mt-1">
            Unduh riwayat slip gaji bulanan Anda.
          </p>
        </div>

        {/* --- LIST PAYSLIP --- */}
        <div className="space-y-4">
          {payslips.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
              <DocumentTextIcon className="w-16 h-16 text-gray-200 mb-4" />
              <p className="text-gray-400 font-bold text-lg">
                Belum ada slip gaji.
              </p>
              <p className="text-gray-400 text-sm max-w-xs mt-2">
                Slip gaji Anda akan muncul di sini setelah diunggah oleh
                HR/Admin.
              </p>
            </div>
          ) : (
            payslips.map((payslip) => (
              <div
                key={payslip.id}
                className="bg-white rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md border border-gray-100 flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 text-[#007CC2]">
                    <DocumentTextIcon className="w-6 h-6 md:w-7 md:h-7" />
                  </div>
                  <div>
                    <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-1">
                      Periode
                    </p>
                    <p className="font-black text-gray-800 text-lg md:text-xl">
                      {getMonthName(payslip.month)} {payslip.year}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(payslip.id, payslip.file_path)}
                  disabled={isDownloading === payslip.id}
                  className="p-3 md:px-6 md:py-3 bg-gray-50 hover:bg-[#007CC2] hover:text-white text-gray-600 rounded-xl font-bold transition-all shadow-sm active:scale-95 flex items-center gap-2 border border-gray-200 hover:border-[#007CC2]"
                >
                  {isDownloading === payslip.id ? (
                    <span className="loading loading-spinner w-5 h-5"></span>
                  ) : (
                    <>
                      <span className="hidden md:inline">Unduh / Lihat</span>
                      <ArrowDownTrayIcon className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- ERROR MODAL --- */}
      {errorModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-4xl shadow-2xl w-full max-w-sm p-8 text-center border-4 border-red-500/20">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6 border border-red-200">
              <ExclamationTriangleIcon className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">
              Terjadi Kesalahan
            </h3>
            <p className="text-gray-500 mb-8 font-medium">
              {errorModal.message}
            </p>
            <button
              onClick={() => setErrorModal({ show: false, message: "" })}
              className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-black text-lg transition-colors active:scale-95"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
