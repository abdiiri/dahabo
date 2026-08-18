import { useState } from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CITIES } from "@/data/cities";

/**
 * A dropdown for picking a city/town — used everywhere the app asks for a
 * pickup point, destination, or branch/warehouse city (transport orders,
 * trips, shipments, driver work assignments, the public quote form).
 *
 * It's a searchable list (type to filter `CITIES`) rather than a strict
 * enum: if someone types a place that isn't in the shortlist, an "Use ..."
 * option lets them go with it anyway. That keeps data entry fast for the
 * common Kenyan/regional hubs while never blocking a genuinely new
 * destination.
 */
export function CityCombobox({
  value,
  onChange,
  placeholder = "Select a city…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const trimmedSearch = search.trim();
  const isCustomValue = trimmedSearch.length > 0 && !CITIES.some((c) => c.toLowerCase() === trimmedSearch.toLowerCase());

  function choose(city: string) {
    onChange(city);
    setSearch("");
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 w-full justify-between border-input px-3 py-2 text-sm font-normal shadow-sm",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <MapPin className="size-3.5 shrink-0 opacity-60" />
            <span className="truncate">{value || placeholder}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter>
          <CommandInput
            placeholder="Search or type a city…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty className="px-3 py-3 text-left text-sm text-muted-foreground">
              No matching city.
            </CommandEmpty>
            <CommandGroup>
              {isCustomValue ? (
                <CommandItem value={trimmedSearch} onSelect={() => choose(trimmedSearch)}>
                  <MapPin className="opacity-60" />
                  Use "{trimmedSearch}"
                </CommandItem>
              ) : null}
              {CITIES.map((city) => (
                <CommandItem key={city} value={city} onSelect={() => choose(city)}>
                  <Check className={cn("opacity-0", value === city && "opacity-100")} />
                  {city}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
