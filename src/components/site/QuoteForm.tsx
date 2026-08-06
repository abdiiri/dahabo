import { useState } from "react";
import { Eraser, Loader2, SendHorizonal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cargoTypes, counties, countries } from "@/data/site";
import { cn } from "@/lib/utils";

type Fields = {
  name: string;
  company: string;
  phone: string;
  email: string;
  cargoType: string;
  pickupCountry: string;
  pickupCounty: string;
  pickupCity: string;
  destCountry: string;
  destCounty: string;
  destCity: string;
  weight: string;
  packages: string;
  date: string;
  notes: string;
};

const empty: Fields = {
  name: "",
  company: "",
  phone: "",
  email: "",
  cargoType: "",
  pickupCountry: "Kenya",
  pickupCounty: "",
  pickupCity: "",
  destCountry: "Kenya",
  destCounty: "",
  destCity: "",
  weight: "",
  packages: "",
  date: "",
  notes: "",
};

const required: (keyof Fields)[] = [
  "name",
  "phone",
  "email",
  "cargoType",
  "pickupCity",
  "destCity",
  "weight",
];

export function QuoteForm() {
  const [values, setValues] = useState<Fields>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof Fields) => (v: string) => {
    setValues((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const validate = () => {
    const next: Partial<Record<keyof Fields, string>> = {};
    required.forEach((k) => {
      if (!values[k].trim()) next[k] = "This field is required";
    });
    if (values.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) next.email = "Enter a valid email address";
    if (values.phone && values.phone.replace(/\D/g, "").length < 9) next.phone = "Enter a valid phone number";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      toast.success("Quote request received", {
        description: "Our operations desk will respond with pricing within 2 working hours.",
      });
      setValues(empty);
    }, 1000);
  };

  const field = (k: keyof Fields, label: string, extra?: { type?: string; placeholder?: string }) => (
    <div className="min-w-0">
      <Label htmlFor={k} className="text-sm font-semibold">
        {label}
        {required.includes(k) ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      <Input
        id={k}
        type={extra?.type ?? "text"}
        value={values[k]}
        placeholder={extra?.placeholder ?? ""}
        onChange={(e) => set(k)(e.target.value)}
        aria-invalid={Boolean(errors[k])}
        aria-describedby={errors[k] ? `${k}-error` : undefined}
        className={cn("mt-1.5 h-11", errors[k] && "border-destructive focus-visible:ring-destructive/40")}
      />
      {errors[k] ? (
        <p id={`${k}-error`} className="mt-1 text-xs font-medium text-destructive">
          {errors[k]}
        </p>
      ) : null}
    </div>
  );

  const select = (k: keyof Fields, label: string, options: string[], placeholder: string) => (
    <div className="min-w-0">
      <Label className="text-sm font-semibold">
        {label}
        {required.includes(k) ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      <Select value={values[k]} onValueChange={set(k)}>
        <SelectTrigger
          className={cn("mt-1.5 !h-11 w-full", errors[k] && "border-destructive")}
          aria-label={label}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errors[k] ? <p className="mt-1 text-xs font-medium text-destructive">{errors[k]}</p> : null}
    </div>
  );

  return (
    <Card className="p-6 shadow-lift sm:p-8">
      <form onSubmit={submit} noValidate>
        <fieldset className="border-0 p-0">
          <legend className="text-xs font-bold uppercase tracking-[0.24em] text-gold">Contact details</legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {field("name", "Customer name", { placeholder: "Jane Wanjiku" })}
            {field("company", "Company", { placeholder: "Optional" })}
            {field("phone", "Phone", { type: "tel", placeholder: "+254 7xx xxx xxx" })}
            {field("email", "Email", { type: "email", placeholder: "you@company.com" })}
          </div>
        </fieldset>

        <fieldset className="mt-8 border-0 p-0">
          <legend className="text-xs font-bold uppercase tracking-[0.24em] text-gold">Cargo</legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {select("cargoType", "Cargo type", cargoTypes, "Select cargo type")}
            {field("weight", "Estimated weight (kg)", { placeholder: "e.g. 1200" })}
            {field("packages", "Number of packages", { placeholder: "e.g. 24" })}
          </div>
        </fieldset>

        <fieldset className="mt-8 border-0 p-0">
          <legend className="text-xs font-bold uppercase tracking-[0.24em] text-gold">Pickup</legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {select("pickupCountry", "Pickup country", countries, "Select country")}
            {select("pickupCounty", "Pickup county", counties, "Select county")}
            {field("pickupCity", "Pickup city / town", { placeholder: "e.g. Nairobi" })}
          </div>
        </fieldset>

        <fieldset className="mt-8 border-0 p-0">
          <legend className="text-xs font-bold uppercase tracking-[0.24em] text-gold">Destination</legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {select("destCountry", "Destination country", countries, "Select country")}
            {select("destCounty", "Destination county", counties, "Select county")}
            {field("destCity", "Destination city / town", { placeholder: "e.g. Mombasa" })}
          </div>
        </fieldset>

        <fieldset className="mt-8 border-0 p-0">
          <legend className="text-xs font-bold uppercase tracking-[0.24em] text-gold">Schedule</legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {field("date", "Preferred pickup date", { type: "date" })}
            <div className="min-w-0">
              <Label htmlFor="notes" className="text-sm font-semibold">
                Special instructions
              </Label>
              <Textarea
                id="notes"
                value={values.notes}
                onChange={(e) => set("notes")(e.target.value)}
                placeholder="Access restrictions, handling notes, timing constraints…"
                className="mt-1.5 min-h-[92px]"
              />
            </div>
          </div>
        </fieldset>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="bg-gold text-gold-foreground hover:bg-gold/90"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <SendHorizonal className="size-4" />}
            Request Quote
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={() => {
              setValues(empty);
              setErrors({});
            }}
          >
            <Eraser className="size-4" /> Clear Form
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Fields marked <span className="text-destructive">*</span> are required. We respond within 2 working hours.
        </p>
      </form>
    </Card>
  );
}
