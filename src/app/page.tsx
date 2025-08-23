import { Suspense } from 'react';
import { HeroSection } from '@/components/sections/hero';
import { FeaturesSection } from '@/components/sections/features';
import { StatsSection } from '@/components/sections/stats';
import { CTASection } from '@/components/sections/cta';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// OpenNext/Cloudflare Workers runs at the edge by default

export default function HomePage() {
  return (
    <div className="space-y-16">
      <Suspense fallback={<LoadingSpinner />}>
        <HeroSection />
      </Suspense>
      
      <Suspense fallback={<LoadingSpinner />}>
        <FeaturesSection />
      </Suspense>
      
      <Suspense fallback={<LoadingSpinner />}>
        <StatsSection />
      </Suspense>
      
      <Suspense fallback={<LoadingSpinner />}>
        <CTASection />
      </Suspense>
    </div>
  );
}

// Generate static params for ISR (Incremental Static Regeneration)
export async function generateStaticParams() {
  return [];
}

// Metadata for this specific page
export const metadata = {
  title: 'Home',
  description: 'Welcome to our Next.js application running on Cloudflare Pages',
};