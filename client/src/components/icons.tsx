import {
  Banknote,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  CircleDollarSign,
  Clapperboard,
  Coffee,
  Dumbbell,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Laptop,
  Lightbulb,
  PiggyBank,
  Plane,
  ShoppingBag,
  Smartphone,
  Tag,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
  Wifi,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  Banknote,
  Wallet,
  Laptop,
  Briefcase,
  TrendingUp,
  CircleDollarSign,
  UtensilsCrossed,
  Bus,
  GraduationCap,
  Lightbulb,
  ShoppingBag,
  HeartPulse,
  Clapperboard,
  PiggyBank,
  Tag,
  House,
  Wifi,
  Coffee,
  Car,
  Gift,
  Plane,
  BookOpen,
  Smartphone,
  Dumbbell,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Tag;
  return <Icon className={className} aria-hidden="true" />;
}

export const CATEGORY_ICON_NAMES = Object.keys(ICONS);
