import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export const Route = createFileRoute("/otp")({
  head: () => ({
    meta: [
      { title: "OTP Verification | Dahabo Global Logistics" },
      { name: "description", content: "Enter the six-digit verification code sent to your registered device." },
      { property: "og:title", content: "OTP Verification | Dahabo Global Logistics" },
      { property: "og:description", content: "Enter the six-digit verification code sent to your registered device." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AuthLayout title="Verify your identity" subtitle="Enter the 6-digit code sent to +254 •• ••• 100."
      footer={<Link to="/staff-login" className="font-semibold text-primary hover:text-gold">Back to sign in</Link>}>
      <div className="grid gap-5">
        <InputOTP maxLength={6}>
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
          </InputOTPGroup>
        </InputOTP>
        <Button asChild><Link to="/staff">Verify and continue</Link></Button>
        <p className="text-center text-sm text-muted-foreground">Didn't get a code? <span className="font-semibold text-primary">Resend in 42s</span></p>
      </div>
    </AuthLayout>
  );
}
