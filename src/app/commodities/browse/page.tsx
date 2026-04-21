import { Suspense } from "react";
import { CommoditiesBrowseClient } from "./browse-client";

export const metadata = {
  title: "Browse Commodities — Silk Road Africa",
  description:
    "Browse African coffee, cocoa, tea, spices, and minerals from verified cooperatives and producers.",
};

export default function CommoditiesBrowsePage() {
  return (
    <Suspense>
      <CommoditiesBrowseClient />
    </Suspense>
  );
}
