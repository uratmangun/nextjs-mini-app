'use client';

import Link from 'next/link';
import { useState } from 'react';

export function HeroSection() {
  const [repoName, setRepoName] = useState('');

  const handleCreateRepo = () => {
    if (!repoName.trim()) {
      alert('Please enter a repository name');
      return;
    }

    const sanitizedRepoName = repoName.trim().replace(/[^a-zA-Z0-9-_]/g, '-');
    
    // Generate GitHub CLI command to create repo from current template
    const ghCommand = `gh repo create ${sanitizedRepoName} --template uratmangun/nextjs-cloudflare --private --clone`;
    
    // Copy to clipboard and show instructions
    navigator.clipboard.writeText(ghCommand).then(() => {
      alert(`GitHub CLI command copied to clipboard!\n\nRun this command in your terminal:\n${ghCommand}\n\nThis will create a new GitHub repository using this project as a template and clone it locally.`);
    }).catch(() => {
      // Fallback if clipboard API fails
      alert(`Run this command in your terminal:\n\n${ghCommand}\n\nThis will create a new GitHub repository using this project as a template and clone it locally.`);
    });
    
    setRepoName('');
  };

  return (
    <section className="relative py-20 md:py-32">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 rounded-3xl"></div>
      <div className="relative z-10 text-center space-y-6">
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
          Next.js on Cloudflare Pages
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
          Lightning-fast edge deployment with Next.js 14, TypeScript, and Cloudflare Workers runtime
        </p>
        
        {/* Repository Creation Section */}
        <div className="max-w-md mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="Enter repository name"
              className="flex-1 px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={false}
            />
            <button
              onClick={handleCreateRepo}
              disabled={!repoName.trim()}
              className="btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Repo
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link
            href="/features"
            className="btn-primary px-8 py-3 text-lg"
          >
            Get Started
          </Link>
          <Link
            href="/api-test"
            className="btn-outline px-8 py-3 text-lg"
          >
            Test API Routes
          </Link>
        </div>
        <div className="pt-8">
          <p className="text-sm text-muted-foreground">
            Deployed globally on Cloudflare's edge network • Sub-50ms response times
          </p>
        </div>
      </div>
    </section>
  );
}