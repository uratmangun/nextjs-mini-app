'use client';

import { useEffect, useState } from 'react';

const stats = [
  { id: 1, name: 'Global Edge Locations', value: '300+', unit: '' },
  { id: 2, name: 'Average Response Time', value: '50', unit: 'ms' },
  { id: 3, name: 'Uptime Guarantee', value: '99.99', unit: '%' },
  { id: 4, name: 'Active Developers', value: '10M+', unit: '' },
];

export function StatsSection() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative isolate overflow-hidden bg-gray-900 dark:bg-gray-950 py-16 sm:py-24 rounded-3xl">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
            Built for Scale
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            Join millions of developers who trust Cloudflare's infrastructure to power their applications at any scale.
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-2xl lg:mx-0 lg:max-w-none">
          <dl className="mt-16 grid grid-cols-1 gap-8 sm:mt-20 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.id} className="flex flex-col-reverse">
                <dt className="text-base leading-7 text-gray-300">{stat.name}</dt>
                <dd className="text-2xl font-bold leading-9 tracking-tight text-white">
                  {mounted ? (
                    <span className="tabular-nums">
                      {stat.value}
                      {stat.unit && <span className="text-cyan-400">{stat.unit}</span>}
                    </span>
                  ) : (
                    <span className="text-gray-600">--</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div
        className="absolute left-1/2 top-0 -z-10 -translate-x-1/2 blur-3xl xl:-top-6"
        aria-hidden="true"
      >
        <div
          className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-cyan-500 to-teal-500 opacity-20"
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>
    </section>
  );
}
