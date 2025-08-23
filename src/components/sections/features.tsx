const features = [
  {
    name: 'Edge Runtime',
    description: 'Deploy your Next.js app globally on Cloudflare\'s edge network for ultra-low latency.',
    icon: '🌍',
  },
  {
    name: 'Serverless Architecture',
    description: 'Scale automatically with no servers to manage. Pay only for what you use.',
    icon: '☁️',
  },
  {
    name: 'Lightning Fast',
    description: 'Leverage Cloudflare\'s global CDN for blazing fast content delivery worldwide.',
    icon: '⚡',
  },
  {
    name: 'Enterprise Security',
    description: 'Built-in DDoS protection, SSL, and Web Application Firewall included.',
    icon: '🛡️',
  },
  {
    name: 'Developer Friendly',
    description: 'Easy deployment with Wrangler CLI and seamless Git integration.',
    icon: '💻',
  },
  {
    name: 'KV Storage & D1',
    description: 'Access Cloudflare\'s edge storage solutions for data persistence.',
    icon: '🗄️',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-base font-semibold leading-7 text-cyan-600 dark:text-cyan-400">
            Deploy Faster
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Everything you need to ship production apps
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            Combine the power of Next.js with Cloudflare's global edge network for unmatched performance and reliability.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.name} className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900 dark:text-white">
                  <span className="text-2xl" aria-hidden="true">
                    {feature.icon}
                  </span>
                  {feature.name}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600 dark:text-gray-300">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
