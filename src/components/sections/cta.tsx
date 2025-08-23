import Link from 'next/link';

export function CTASection() {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-r from-cyan-600 to-teal-600 px-6 py-24 shadow-2xl sm:rounded-3xl sm:px-24 xl:py-32">
      <h2 className="mx-auto max-w-2xl text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Ready to Deploy on the Edge?
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-lg leading-8 text-cyan-100">
        Start building lightning-fast applications with Next.js and Cloudflare Pages today.
      </p>
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <Link
          href="https://developers.cloudflare.com/pages/framework-guides/nextjs/"
          className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          Get Started
        </Link>
        <Link
          href="https://github.com/cloudflare/next-on-pages"
          className="text-sm font-semibold leading-6 text-white hover:text-cyan-100 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          View on GitHub <span aria-hidden="true">→</span>
        </Link>
      </div>
      <svg
        viewBox="0 0 1024 1024"
        className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2 [mask-image:radial-gradient(closest-side,white,transparent)]"
        aria-hidden="true"
      >
        <circle
          cx={512}
          cy={512}
          r={512}
          fill="url(#gradient-cta)"
          fillOpacity="0.7"
        />
        <defs>
          <radialGradient id="gradient-cta">
            <stop stopColor="#7dd3c0" />
            <stop offset={1} stopColor="#0891b2" />
          </radialGradient>
        </defs>
      </svg>
    </section>
  );
}
