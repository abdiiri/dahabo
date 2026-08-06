import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PortalShell } from "@/components/portal/PortalShell";
import { customerNav } from "@/config/navigation";

export const Route = createFileRoute("/portal")({ component: Layout });

function Layout() {
  return (
    <PortalShell
      nav={customerNav}
      persona={{ name: "Jane Mwangi", role: "Customer", initials: "JM", email: "ops@sahaltrading.com" }}
    >
      <Outlet />
    </PortalShell>
  );
}
