import { Suspense } from "react";
import type { Metadata } from "next";
import { Studio } from "@/components/studio/studio";

export const metadata: Metadata = {
  title: "Studio — GenUI",
};

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-bg" />}>
      <Studio />
    </Suspense>
  );
}
