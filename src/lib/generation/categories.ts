export type Category = {
  id: string;
  label: string;
  hint: string;
};

export const CATEGORIES: Category[] = [
  { id: "auto", label: "Anything", hint: "Let the prompt decide" },
  { id: "button", label: "Button", hint: "CTAs, toggles, icon buttons" },
  { id: "card", label: "Card", hint: "Product, profile, stat cards" },
  { id: "accordion", label: "Accordion", hint: "FAQ, collapsible sections" },
  { id: "hero", label: "Hero", hint: "Landing page headers" },
  { id: "navbar", label: "Navbar", hint: "Top bars, docks, menus" },
  { id: "pricing", label: "Pricing", hint: "Plans and tiers" },
  { id: "form", label: "Form", hint: "Inputs, sign-in, newsletter" },
  { id: "modal", label: "Modal", hint: "Dialogs and sheets" },
  { id: "tabs", label: "Tabs", hint: "Segmented controls" },
  { id: "testimonial", label: "Testimonial", hint: "Quotes and reviews" },
  { id: "loader", label: "Loader", hint: "Spinners, skeletons" },
  { id: "footer", label: "Footer", hint: "Site footers" },
];

export const PROMPT_IDEAS = [
  "A glassy pricing card with a shimmering border that follows the cursor",
  "Magnetic CTA button that springs toward the pointer, with a glow on hover",
  "FAQ accordion with smooth height animation and rotating plus icons",
  "Floating dock navbar like macOS that magnifies icons on hover",
  "Testimonial marquee with two rows scrolling in opposite directions",
  "Sign-in form with floating labels and a subtle success animation",
];

export function getCategory(id: string | undefined): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}
