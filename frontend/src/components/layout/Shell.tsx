import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function Shell() {
  const location = useLocation();
  // Default open on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 768,
  );

  // Auto-close on route change for mobile UX
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-void-black">
      <div className="app-aurora" aria-hidden />

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-void-black/70 backdrop-blur-sm transition-opacity md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Topbar onToggleSidebar={() => setSidebarOpen((v) => !v)} sidebarOpen={sidebarOpen} />
        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-8 md:py-10 lg:px-14">
          <div className="mx-auto max-w-[1400px]">
            <div key={location.pathname} className="animate-fade-in">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
