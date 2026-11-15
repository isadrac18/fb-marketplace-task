import {
  Briefcase,
  Building2,
  Car,
  Dumbbell,
  Film,
  Gamepad2,
  Gift,
  Hammer,
  Home,
  Music,
  Palette,
  PawPrint,
  Shirt,
  Smartphone,
  Sofa,
  Store,
  Tag,
  Trees,
  Users,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Car,
  Home,
  Shirt,
  Tag,
  Smartphone,
  Film,
  Users,
  Gift,
  Trees,
  Palette,
  Sofa,
  Hammer,
  Building2,
  Music,
  Briefcase,
  PawPrint,
  Dumbbell,
  Gamepad2,
  Store,
};

export function CategoryIcon({
  name,
  className = "size-4",
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICON_MAP[name] ?? Tag;
  return <Icon className={className} />;
}
