import { Category } from "./types";

export const MARKETPLACE_CATEGORIES: Category[] = [
  { name: "Vehicles", slug: "vehicles", iconName: "Car" },
  { name: "Property Rentals", slug: "property-rentals", iconName: "Home" },
  { name: "Apparel", slug: "apparel", iconName: "Shirt" },
  { name: "Classifieds", slug: "classifieds", iconName: "Tag" },
  { name: "Electronics", slug: "electronics", iconName: "Smartphone" },
  { name: "Entertainment", slug: "entertainment", iconName: "Film" },
  { name: "Family", slug: "family", iconName: "Users" },
  { name: "Free Stuff", slug: "free-stuff", iconName: "Gift" },
  { name: "Garden & Outdoor", slug: "garden-outdoor", iconName: "Trees" },
  { name: "Hobbies", slug: "hobbies", iconName: "Palette" },
  { name: "Home Goods", slug: "home-goods", iconName: "Sofa" },
  { name: "Home Improvement", slug: "home-improvement", iconName: "Hammer" },
  { name: "Home Sales", slug: "home-sales", iconName: "Building2" },
  { name: "Musical Instruments", slug: "musical-instruments", iconName: "Music" },
  { name: "Office Supplies", slug: "office-supplies", iconName: "Briefcase" },
  { name: "Pet Supplies", slug: "pet-supplies", iconName: "PawPrint" },
  { name: "Sporting Goods", slug: "sporting-goods", iconName: "Dumbbell" },
  { name: "Toys & Games", slug: "toys-games", iconName: "Gamepad2" },
  { name: "Buy and sell groups", slug: "buy-and-sell-groups", iconName: "Store" },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return MARKETPLACE_CATEGORIES.find((cat) => cat.slug === slug);
}
