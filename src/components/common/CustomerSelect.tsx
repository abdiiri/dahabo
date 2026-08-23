import { useState } from "react";
import { UserPlus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddCustomerDialog } from "@/components/staff/AddCustomerDialog";
import type { Customer } from "@/lib/api/types";

const NEW_CUSTOMER = "__new_customer__";

/**
 * A customer-picking <Select> with a built-in "+ Add new customer" option.
 * Picking it opens the same New Customer dialog used on the Customers tab,
 * right where the form already is — no more abandoning an in-progress order
 * to go create the customer elsewhere and coming back to start over.
 */
export function CustomerSelect({
  customers,
  value,
  onChange,
  onCustomerCreated,
  placeholder = "No customer",
  allowNone = true,
}: {
  customers: Customer[];
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  /** Fires after the new customer is saved, so the caller can add it to its
   * own in-memory customers list without a full re-fetch. */
  onCustomerCreated: (customer: Customer) => void;
  placeholder?: string;
  /** Set false for a required picker (e.g. a ledger entry, which must have a
   * customer) so "No customer" isn't offered as a real option. */
  allowNone?: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <Select
        value={value ?? (allowNone ? "none" : undefined)}
        onValueChange={(v) => {
          if (v === NEW_CUSTOMER) {
            setAddOpen(true);
            return;
          }
          onChange(v === "none" ? undefined : v);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowNone ? <SelectItem value="none">No customer</SelectItem> : null}
          {customers.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={NEW_CUSTOMER} className="font-medium text-primary">
            <span className="inline-flex items-center gap-1.5">
              <UserPlus className="size-3.5" /> Add new customer
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
      <AddCustomerDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(customer) => {
          onCustomerCreated(customer);
          onChange(customer.id);
        }}
      />
    </>
  );
}
