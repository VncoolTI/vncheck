// src/lib/auth-admin.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type AuthResult =
  | { authorized: true; userId: string; role: "admin" | "super_admin" }
  | { authorized: false; status: 401 | 403; message: string };

// Dipakai di AWAL setiap API route yang cuma boleh diakses admin/super_admin.
// Middleware TIDAK melindungi path /api/*, jadi tiap route handler WAJIB
// panggil ini sendiri.
export async function requireAdmin(): Promise<AuthResult> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // no-op
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, status: 401, message: "Belum login." };
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = employee?.role;

  if (role !== "admin" && role !== "super_admin") {
    return {
      authorized: false,
      status: 403,
      message: "Kamu tidak punya akses untuk melakukan ini.",
    };
  }

  return { authorized: true, userId: user.id, role };
}
