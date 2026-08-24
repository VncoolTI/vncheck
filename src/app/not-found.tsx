
export const dynamic = "force-dynamic";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-4">
      <h2 className="text-4xl font-black text-gray-900 mb-4">404</h2>
      <p className="text-lg text-gray-600 mb-8">Page Not Found</p>
      <Link
        href="/"
        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}
