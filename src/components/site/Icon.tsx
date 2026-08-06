import { icons, Truck, type LucideProps } from "lucide-react";

/** Renders a Lucide icon by name from mock data. Falls back to a truck. */
export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = (icons as Record<string, React.ComponentType<LucideProps>>)[name] ?? Truck;
  return <Cmp {...props} />;
}
