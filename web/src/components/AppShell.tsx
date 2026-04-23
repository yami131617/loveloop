"use client";
import { usePathname } from "next/navigation";
import { DesktopNav } from "./DesktopNav";
import { ReactNode } from "react";

// Routes where we don't want the app chrome (landing, auth, and some fullscreen pages)
const BARE_ROUTES = ["/", "/login", "/register", "/dev/token"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isBare = BARE_ROUTES.includes(pathname);

  if (isBare) {
    // Landing + auth: no sidebar, content is already self-contained
    return <>{children}</>;
  }

  return (
    <>
      <DesktopNav />
      {/* Push the page content past the sidebar on desktop only. Mobile stays full-width. */}
      <div className="lg:pl-64 xl:pl-72 min-h-screen">
        {children}
      </div>
    </>
  );
}
