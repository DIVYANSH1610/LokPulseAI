import {
  BriefcaseBusiness,
  Brush,
  Bus,
  CircleHelp,
  Construction,
  Droplets,
  FolderKanban,
  HeartPulse,
  Landmark,
  MapPin,
  School,
  Shield,
  Users,
  Vote,
  Wheat,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Issue category -> icon. Single source of truth across all views. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Road: Construction,
  Health: HeartPulse,
  Education: School,
  Water: Droplets,
  Electricity: Zap,
  Sanitation: Brush,
  Agriculture: Wheat,
  "Women Safety": Shield,
  Transport: Bus,
  Employment: BriefcaseBusiness,
  Other: MapPin,
};

export function CategoryIcon({
  category,
  className = "size-4",
}: {
  category: string;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[category] ?? CircleHelp;
  return <Icon className={className} aria-hidden="true" />;
}

/** Role -> icon for the landing page role cards. */
export const ROLE_ICONS: Record<string, LucideIcon> = {
  mp_office: Landmark,
  mla_office: Vote,
  district_admin: FolderKanban,
  panchayat_officer: MapPin,
  citizen: Users,
};

/**
 * Brand mark: Landmark glyph in a teal tile. `tone` controls the tile
 * style for dark (navy header/footer) vs light surfaces.
 */
export function BrandMark({
  tone = "dark",
  className = "",
}: {
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <span
      className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
        tone === "dark" ? "bg-teal-600 text-white" : "bg-navy-900 text-white"
      } ${className}`}
      aria-hidden="true"
    >
      <Landmark className="size-4.5" />
    </span>
  );
}
