import {
  Baby,
  BedSingle,
  Church,
  IceCreamBowl,
  Kayak,
  Landmark,
  MapPin,
  Martini,
  Palette,
  Sparkles,
  Store,
  TreeDeciduous,
  Utensils,
} from 'lucide-react'

export type POIRole = 'accommodation' | 'meal' | 'attraction'
export type POITheme =
  | 'religious_sites'
  | 'adventure'
  | 'art_museums'
  | 'family'
  | 'nature'
  | 'nightlife'
  | 'relax'
  | 'shopping'
  | 'cultural_history'
  | 'food_culinary'

// Theme icon mapping
const themeIcons: Record<POITheme, typeof Church> = {
  religious_sites: Church,
  adventure: Kayak,
  art_museums: Palette,
  family: Baby,
  nature: TreeDeciduous,
  nightlife: Martini,
  relax: Sparkles,
  shopping: Store,
  cultural_history: Landmark,
  food_culinary: IceCreamBowl,
}

/**
 * Get the appropriate icon for a POI based on its role and themes
 * Priority: role-specific icons (hotel, meal) > theme icons > generic attraction icon
 */
function getPOIIconInternal(role?: string, themes?: string[] | null): typeof MapPin {
  if (role === 'accommodation') {
    return BedSingle
  }

  if (role === 'meal') {
    return Utensils
  }

  if (themes && themes.length > 0) {
    for (const theme of themes) {
      if (theme in themeIcons) {
        return themeIcons[theme as POITheme]
      }
    }
  }

  return MapPin
}

/**
 * Get icon component with default styling
 */
export function POIIcon({
  role,
  themes,
  className = 'size-4',
}: {
  role?: string
  themes?: string[] | null
  className?: string
}) {
  const Icon = getPOIIconInternal(role, themes)
  return <Icon className={className} />
}
