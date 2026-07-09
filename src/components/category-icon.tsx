import {
  PartyPopper, UtensilsCrossed, Utensils, Fuel, Car, ShoppingBag, Shirt,
  Tag, Coffee, Pizza, Wine, Plane, Train, Bus, Bike, Home, Gift, Heart,
  Dumbbell, GraduationCap, Book, Film, Music, Gamepad2, Smartphone, Laptop,
  Stethoscope, Pill, PawPrint, Baby, Wrench, Zap, Droplet, Wifi,
  CreditCard, PiggyBank, Briefcase, Sparkles, type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  PartyPopper, UtensilsCrossed, Utensils, Fuel, Car, ShoppingBag, Shirt,
  Tag, Coffee, Pizza, Wine, Plane, Train, Bus, Bike, Home, Gift, Heart,
  Dumbbell, GraduationCap, Book, Film, Music, Gamepad2, Smartphone, Laptop,
  Stethoscope, Pill, PawPrint, Baby, Wrench, Zap, Droplet, Wifi,
  CreditCard, PiggyBank, Briefcase, Sparkles,
};

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);

export function getCategoryIcon(name?: string | null): LucideIcon {
  if (name && CATEGORY_ICONS[name]) return CATEGORY_ICONS[name];
  return Tag;
}

export function CategoryIcon({
  name,
  className,
  size,
  style,
}: {
  name?: string | null;
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}) {
  const Icon = getCategoryIcon(name);
  return <Icon className={className} size={size} style={style} />;
}
