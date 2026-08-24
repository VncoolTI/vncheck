"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  EyeIcon, 
  EyeSlashIcon, 
  LockClosedIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon 
} from "@heroicons/react/24/solid";

export default function ForceChangePasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // State Modals
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 1. Validasi Frontend
    if (password.length < 6) {
        setErrorMsg("Password minimal 6 karakter.");
        return;
    }
    if (password !== confirmPassword) {
        setErrorMsg("Password konfirmasi tidak cocok.");
        return;
    }
    
    setLoading(true);
    try {
      // 2. Cek User Session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi habis. Silakan login ulang.");

      // 3. Update Password di Supabase Auth (Sistem Login)
      const { error: authError } = await supabase.auth.updateUser({ password: password });
      if (authError) throw authError;

      // 4. Update Status di Database (Agar tidak looping lagi)
      // Pastikan SQL Policy sudah dijalankan agar user boleh update row ini
      const { error: dbError } = await supabase
        .from("employees")
        .update({ must_change_password: false })
        .eq("id", user.id);

      if (dbError) {
          console.error("DB Error:", dbError);
          // Tetap lanjut jika auth sukses, tapi log errornya. 
          // Idealnya throw error, tapi demi UX user bisa masuk dulu.
          // Namun untuk mencegah loop, DB update wajib sukses.
          throw new Error("Gagal mengupdate status database. Pastikan RLS Policy sudah aktif.");
      }

      // 5. Sukses -> Tampilkan Modal
      setShowSuccessModal(true);

    } catch (error: any) {
      setErrorMsg(error.message || "Gagal mengganti password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = async () => {
      // Logout user agar mereka login ulang dengan password baru (Best Practice Security)
      await supabase.auth.signOut();
      router.replace("/login");
  };

  return (
    <main className="min-h-screen w-full bg-white flex flex-col items-center font-sans relative">
      
      {/* HEADER IMAGE */}
      <div className="relative w-full h-[35vh] shrink-0 overflow-hidden bg-[#007CC2]">
        {/* Pastikan file bg-splash-desktop.svg ada di folder public */}
        <Image 
            src="/bg-splash-desktop.svg" 
            alt="Header Wave"
            fill
            className="object-cover object-bottom opacity-50 mix-blend-overlay" 
            priority
        />
        <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-lg">
                <LockClosedIcon className="w-10 h-10 text-white" />
             </div>
        </div>
      </div>

      {/* FORM AREA */}
      <div className="flex-1 w-full max-w-[450px] px-6 -mt-16 z-10">
        
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="mb-6 text-center">
                <h1 className="text-2xl font-extrabold text-slate-900">Setup Password</h1>
                <p className="text-gray-500 text-sm mt-2">
                    Demi keamanan, Anda wajib mengganti password default sebelum melanjutkan.
                </p>
            </div>

            {/* Error Alert (In-Form) */}
            {errorMsg && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r flex items-start gap-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600 shrink-0" />
                    <p className="text-sm text-red-700 font-medium">{errorMsg}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* New Password */}
                <div className="space-y-1">
                    <label className="block text-gray-700 font-bold text-sm mb-1">Password Baru</label>
                    <div className="relative">
                        <input 
                            type={showPassword ? "text" : "password"} 
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            // PERBAIKAN WARNA TEKS: text-gray-900
                            className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg py-3 pl-4 pr-10 outline-none focus:border-[#007CC2] focus:ring-2 focus:ring-[#007CC2]/20 transition-all placeholder:text-gray-400"
                            placeholder="Minimal 6 karakter"
                        />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#007CC2]"
                        >
                            {showPassword ? <EyeSlashIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5"/>}
                        </button>
                    </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                    <label className="block text-gray-700 font-bold text-sm mb-1">Konfirmasi Password</label>
                    <input 
                        type={showPassword ? "text" : "password"} 
                        required
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        // PERBAIKAN WARNA TEKS: text-gray-900
                        className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg py-3 pl-4 pr-10 outline-none focus:border-[#007CC2] focus:ring-2 focus:ring-[#007CC2]/20 transition-all placeholder:text-gray-400"
                        placeholder="Ketik ulang password baru"
                    />
                </div>

                <button 
                    disabled={loading}
                    className="w-full bg-[#007CC2] text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-blue-700 transition-all active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-4"
                >
                    {loading ? "Menyimpan..." : "Simpan Password & Masuk"}
                </button>
            </form>
        </div>
        
        <p className="text-center text-xs text-gray-400 mt-8">
            © VNCHECK HR System
        </p>

      </div>

      {/* --- SUCCESS MODAL --- */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center transform transition-all scale-100">
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
                    <CheckCircleIcon className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Password Updated!</h3>
                <p className="text-gray-500 mb-8 px-2 text-sm leading-relaxed">
                    Password Anda berhasil diperbarui. Silakan login kembali menggunakan password baru Anda.
                </p>
                <button 
                    onClick={handleSuccess} 
                    className="w-full py-3 bg-[#007CC2] hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-all active:scale-95"
                >
                    Login Sekarang
                </button>
            </div>
        </div>
      )}

    </main>
  );
}