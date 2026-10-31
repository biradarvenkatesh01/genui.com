import { Nav } from "@/components/marketing/nav";
import { Hero } from "@/components/marketing/hero";
import { CategoryMarquee, FinalCta, HowItWorks, Roadmap, Showcase } from "@/components/marketing/sections";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <CategoryMarquee />
        <HowItWorks />
        <Showcase />
        <Roadmap />
        <FinalCta />
      </main>
    </>
  );
}
