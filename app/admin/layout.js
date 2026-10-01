import SideBar from "@/components/features/navbar/SideBar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import LiveChat from "@/components/features/liveChat/LiveChat";

export default function RootLayout({ children }) {
  return (
  
    <SidebarProvider
      style={{
        "--sidebar-width": "22rem",

        "--sidebar-width-mobile": "22rem",
      }}
    >
      <SideBar variant="inset" />
      <SidebarTrigger className="sticky top-4 z-40 m-2 hidden size-11 rounded-xl border border-white/70 bg-white/70 shadow-lg backdrop-blur-xl lg:inline-flex" />
      <main className="min-w-0 flex-1 px-3 pb-32 sm:px-5 lg:px-8 lg:pb-0">{children}</main>
      <LiveChat />
    </SidebarProvider>
  );
}
