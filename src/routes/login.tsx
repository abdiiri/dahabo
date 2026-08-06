import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Customer Login | Dahabo Global Logistics" },
      { name: "description", content: "Sign in to the Dahabo customer portal to track shipments, view invoices and request pickups." },
      { property: "og:title", content: "Customer Login | Dahabo Global Logistics" },
      { property: "og:description", content: "Sign in to the Dahabo customer portal to track shipments, view invoices and request pickups." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AuthLayout
      title="Customer sign in"
      subtitle="Access your shipments, invoices and pickup requests."
      footer={<>Staff member? <Link to="/staff-login" className="font-semibold text-primary hover:text-gold">Use the staff portal</Link></>}
    >
      <form className="grid gap-4">
        <div className="grid gap-2"><Label htmlFor="e">Email</Label><Input id="e" type="email" defaultValue="ops@sahaltrading.com" /></div>
        <div className="grid gap-2"><Label htmlFor="p">Password</Label><Input id="p" type="password" defaultValue="password" /></div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted-foreground"><Checkbox defaultChecked /> Remember me</label>
          <Link to="/forgot-password" className="text-sm font-medium text-primary hover:text-gold">Forgot password?</Link>
        </div>
        <Button asChild className="mt-1"><Link to="/portal">Sign in</Link></Button>
      </form>
    </AuthLayout>
  );
}
