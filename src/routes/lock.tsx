import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export const Route = createFileRoute("/lock")({
  head: () => ({
    meta: [
      { title: "Screen Locked | Dahabo Global Logistics" },
      { name: "description", content: "Your session is locked. Enter your password to resume work." },
      { property: "og:title", content: "Screen Locked | Dahabo Global Logistics" },
      { property: "og:description", content: "Your session is locked. Enter your password to resume work." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AuthLayout title="Session locked" subtitle="Amina Dahir · Super Admin"
      footer={<Link to="/login" className="font-semibold text-primary hover:text-gold">Sign in as someone else</Link>}>
      <form className="grid gap-4">
        <div className="grid gap-2"><Label htmlFor="p">Password</Label><Input id="p" type="password" /></div>
        <Button asChild><Link to="/staff">Unlock</Link></Button>
      </form>
    </AuthLayout>
  );
}
