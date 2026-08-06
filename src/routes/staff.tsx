import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PortalShell } from "@/components/portal/PortalShell";
import { staffNav } from "@/config/navigation";

export const Route = createFileRoute("/staff")({ component: Layout });

function Layout() {
  return (
    <PortalShell
      nav={staffNav}
      persona={{ name: "Amina Dahir", role: "Super Admin", initials: "AD", email: "amina@dahaboglobal.com" }}
    >
      <Outlet />
    </PortalShell>
  );
}
