import { Nav } from "@/components/marketing/nav";
import { Hero } from "@/components/marketing/hero";
import { Features, FinalCta, HowItWorks, Roadmap, StackStrip } from "@/components/marketing/sections";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <StackStrip />
        <Features />
        <HowItWorks />
        <Roadmap />
        <FinalCta />
      </main>
    </>
  );
}
