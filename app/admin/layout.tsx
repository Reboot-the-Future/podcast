"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Home, FileText, BookOpen, Film, LogOut, Menu, X } from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    setMounted(true);
    if (!isLoginPage) {
      const token = typeof window !== 'undefined' ? localStorage.getItem("admin_token") : null;
      if (token) {
        setIsAuthenticated(true);
      } else {
        router.replace("/admin/login");
      }
    }
  }, [pathname, isLoginPage, router]);

  if (!mounted) return null;
  if (isLoginPage) return <>{children}</>;
  if (!isAuthenticated) return null;

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: Home },
    { href: "/admin/episodes", label: "Episodes", icon: FileText },
    { href: "/admin/blogs", label: "Blogs", icon: BookOpen },
    { href: "/admin/trailer", label: "Trailer", icon: Film },
  ];

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("admin_token");
    }
    setShowLogoutConfirm(false);
    router.replace("/admin/login?logged_out=1");
  };

  const cancelLogout = () => setShowLogoutConfirm(false);

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`${mobile ? 'flex flex-col h-full' : ''}`}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">
          <span className="text-white">Reboot</span>
          <span className="text-[#ffa9fc]">Admin</span>
        </h2>
        <p className="text-gray-400 text-sm mt-1">Podcast Management</p>
      </div>

      <nav className="space-y-2 flex-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));
          
          return (
            <Link
              key={href}
              href={href}
              onClick={() => mobile && setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? "bg-gradient-to-r from-[#ffa9fc]/20 to-[#ffa9fc]/10 text-[#ffa9fc] font-semibold border border-[#ffa9fc]/30 shadow-lg shadow-[#ffa9fc]/10"
                  : "text-gray-300 hover:bg-[#2a3838]/50 hover:text-white"
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-[#2a3838]">
        <button
          onClick={handleLogout}
          className="w-full py-3 px-4 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-xl flex items-center justify-center gap-2 transition-all font-semibold border border-red-500/20 hover:border-red-500/40"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen text-white bg-[#0f1c1c]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 bg-gradient-to-b from-[#1a2828] to-[#152020] p-6 border-r border-[#2a3838]/50 fixed h-screen overflow-y-auto backdrop-blur-xl">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className="w-64 bg-gradient-to-b from-[#1a2828] to-[#152020] h-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-[#1a2828]/95 backdrop-blur-xl border-b border-[#2a3838] p-4 z-30 flex items-center justify-between">
        <h1 className="text-xl font-bold">
          <span className="text-white">Reboot</span>
          <span className="text-[#ffa9fc]">Admin</span>
        </h1>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-[#2a3838] rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 min-h-screen bg-[#0f1c1c] pt-16 lg:pt-0">
        <div className="min-h-screen">
          {children}
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={cancelLogout} />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-[#2a3838] bg-gradient-to-b from-[#1a2828] to-[#152020] p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white mb-2">Sign out?</h3>
            <p className="text-sm text-gray-300 mb-6">
              You'll be logged out of Reboot Admin and can sign in again anytime.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={cancelLogout}
                className="px-4 py-2 rounded-lg text-gray-200 border border-[#2a3838] hover:bg-[#2a3838]/60 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 rounded-lg text-red-100 bg-red-600/80 hover:bg-red-600 transition-colors border border-red-500/40"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}