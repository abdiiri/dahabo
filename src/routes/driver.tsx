import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { PortalShell } from "@/components/portal/PortalShell";
import { driverNav } from "@/config/navigation";
import { useAuth, personaInitials } from "@/lib/auth";

export const Route = createFileRoute("/driver")({ component: Layout });

function Layout() {
  const { loading, user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/staff-login" });
      return;
    }
    // A signed-in non-driver has no business here.
    if (profile && profile.role !== "driver") {
      navigate({ to: "/staff" });
      return;
    }
    if (profile?.mustChangePassword) {
      navigate({ to: "/create-password" });
    }
  }, [loading, user, profile, navigate]);

  if (loading || !user || !profile || profile.role !== "driver" || profile.mustChangePassword) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface">
        <p className="text-sm text-muted-foreground">Checking your session…</p>
      </div>
    );
  }

  const persona = {
    name: profile.fullName,
    role: profile.roleLabel,
    initials: personaInitials(profile.fullName),
    email: profile.email,
  };

  return (
    <PortalShell
      nav={driverNav}
      persona={persona}
      onSignOut={async () => {
        await signOut();
        navigate({ to: "/staff-login" });
      }}
    >
      <Outlet />
    </PortalShell>
  );
}
