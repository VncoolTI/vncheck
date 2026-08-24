import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // 1. JIKA BELUM LOGIN (GUEST)
  if (!user) {
    // Lindungi halaman admin, employee, dan ganti password
    if (
      path.startsWith("/employee") ||
      path.startsWith("/admin") ||
      path.startsWith("/force-change-password")
    ) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  // 2. JIKA SUDAH LOGIN (AUTHENTICATED)
  if (user) {
    // Gunakan maybeSingle() agar tidak crash (500 Error) jika database timeout
    // Ambil 'role' agar aplikasi siap jika ada halaman Admin
    const { data: employeeData } = await supabase
      .from("employees")
      .select("must_change_password, role")
      .eq("id", user.id)
      .maybeSingle();

    const mustChangePass = employeeData?.must_change_password || false;
    const userRole = employeeData?.role || "employee";

    // A. Cek Wajib Ganti Password
    if (mustChangePass) {
      if (path !== "/force-change-password") {
        return NextResponse.redirect(
          new URL("/force-change-password", request.url),
        );
      }
      return response;
    }

    // B. Cek Akses Halaman Admin
    // Hanya izinkan admin/super_admin untuk mengakses route /admin
    if (
      path.startsWith("/admin") &&
      userRole !== "admin" &&
      userRole !== "super_admin"
    ) {
      return NextResponse.redirect(new URL("/employee/dashboard", request.url));
    }

    // C. Redirect dari halaman Login/Root
    // Siapapun yang login, arahkan ke dashboard yang sesuai
    if (path === "/login" || path === "/") {
      if (userRole === "admin" || userRole === "super_admin") {
        // Bisa diarahkan ke '/admin/dashboard' jika halaman tersebut sudah ada
        return NextResponse.redirect(
          new URL("/employee/dashboard", request.url),
        );
      }
      return NextResponse.redirect(new URL("/employee/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
