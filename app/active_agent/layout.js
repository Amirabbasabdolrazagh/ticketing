import SideBar from "@/components/features/navbar/SideBar";
import { SidebarProvider } from "@/components/ui/sidebar";
import MobileGlassHeader from "@/components/features/navbar/MobileGlassHeader";

export default function Layout({ children }) {
  return <SidebarProvider style={{ "--sidebar-width": "22rem", "--sidebar-width-mobile": "22rem" }}><SideBar /><MobileGlassHeader /><main className="min-w-0 flex-1 px-3 pb-32 pt-24 sm:px-5 sm:pt-28 lg:px-8 lg:pb-0 lg:pt-0">{children}</main></SidebarProvider>;
}
