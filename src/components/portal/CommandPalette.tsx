import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { searchIndex } from "@/config/navigation";
import { Gauge, PackagePlus, UserPlus } from "lucide-react";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();

  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search shipments, customers, drivers, invoices…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => go("/staff/shipments")}>
            <PackagePlus /> Create shipment
          </CommandItem>
          <CommandItem onSelect={() => go("/staff/customers")}>
            <UserPlus /> Create customer
          </CommandItem>
          <CommandItem onSelect={() => go("/staff")}>
            <Gauge /> Open command centre
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        {searchIndex.map((section) => (
          <CommandGroup key={section.group} heading={section.group}>
            {section.items.map((item) => (
              <CommandItem key={item} onSelect={() => go(section.to)}>
                <section.icon /> {item}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}
