import { Hero } from "@/components/sections/Hero";
import { StatsBar } from "@/components/sections/StatsBar";
import { Features } from "@/components/sections/Features";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { LearningTogether } from "@/components/sections/LearningTogether";
import { Subjects } from "@/components/sections/Subjects";
import { Faq } from "@/components/sections/Faq";
import { Cta } from "@/components/SiteUi";

export default function HomePage() {
  return (
    <>
      <Hero />
      <StatsBar />
      <Features />
      <HowItWorks />
      <LearningTogether />
      <Subjects />
      <Faq />
      <Cta />
    </>
  );
}
