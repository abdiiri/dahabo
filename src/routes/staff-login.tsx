import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export const Route = createFileRoute("/staff-login")({
  head: () => ({
    meta: [
      { title: "Staff Login | Dahabo Global Logistics" },
      { name: "description", content: "Secure sign in for Dahabo Global Logistics staff and operations teams." },
      { property: "og:title", content: "Staff Login | Dahabo Global Logistics" },
      { property: "og:description", content: "Secure sign in for Dahabo Global Logistics staff and operations teams." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AuthLayout
      title="Staff sign in"
      subtitle="Operations, finance, warehouse and fleet teams."
      footer={<>Customer? <Link to="/login" className="font-semibold text-primary hover:text-gold">Use the customer portal</Link></>}
    >
      <form className="grid gap-4">
        <div className="grid gap-2"><Label htmlFor="e">Work email</Label><Input id="e" type="email" defaultValue="amina@dahaboglobal.com" /></div>
        <div className="grid gap-2"><Label htmlFor="p">Password</Label><Input id="p" type="password" defaultValue="password" /></div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted-foreground"><Checkbox defaultChecked /> Trust this device</label>
          <Link to="/otp" className="text-sm font-medium text-primary hover:text-gold">Use OTP</Link>
        </div>
        <Button asChild className="mt-1"><Link to="/staff">Sign in</Link></Button>
      </form>
    </AuthLayout>
  );
}
