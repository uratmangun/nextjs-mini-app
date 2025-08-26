'use client';

import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const inApp = await sdk.isInMiniApp();
        setIsInMiniApp(inApp);

        if (inApp) {
          const context = await sdk.context;
          if (context?.user) {
            setUser(context.user);
          }
        }
      } catch (error) {
        console.error('Failed to get context:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleSignIn = async () => {
    try {
      // Generate a random nonce for the sign in request
      const nonce = Math.random().toString(36).substring(7);
      
      await sdk.actions.signIn({ nonce });
      
      // After sign in, try to get the updated context
      const context = await sdk.context;
      if (context?.user) {
        setUser(context.user);
      }
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const handleComposeCast = async () => {
    try {
      await sdk.actions.composeCast({
        text: 'Check out this awesome Farcaster Mini App! 🚀',
        embeds: [window.location.href],
      });
    } catch (error) {
      console.error('Failed to compose cast:', error);
    }
  };

  const handleViewProfile = async (fid: number) => {
    try {
      await sdk.actions.viewProfile({ fid });
    } catch (error) {
      console.error('Failed to view profile:', error);
    }
  };

  const handleOpenUrl = async (url: string) => {
    try {
      await sdk.actions.openUrl(url);
    } catch (error) {
      console.error('Failed to open URL:', error);
    }
  };

  const handleAddMiniApp = async () => {
    try {
      await sdk.actions.addMiniApp();
    } catch (error) {
      console.error('Failed to add mini app:', error);
    }
  };

  const copyToClipboard = async (text: string, commandType: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCommand(commandType);
      setTimeout(() => setCopiedCommand(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-8">
      {/* Hero Section */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
          Farcaster Mini App
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Experience the power of decentralized social networking with our Farcaster Mini App
        </p>
      </section>

      {/* GitHub CLI Template Section */}
      <section className="max-w-4xl mx-auto space-y-4">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">🚀 Get Started with This Template</h2>
          <p className="text-muted-foreground">Clone this template and create your own Farcaster Mini App</p>
        </div>
        
        <div className="max-w-2xl mx-auto">
          {/* Create and Clone Combined */}
          <div className="bg-card rounded-lg p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2 text-lg">
              🚀 Create & Clone Template
            </h3>
            <p className="text-muted-foreground text-sm">
              This command creates a new repository from the template and clones it to your local machine
            </p>
            <div className="bg-background rounded border p-4 font-mono text-sm">
              <code>gh repo create my-farcaster-app --template uratmangun/nextjs-mini-app --clone --public</code>
            </div>
            <button
              onClick={() => copyToClipboard('gh repo create my-farcaster-app --template uratmangun/nextjs-mini-app --clone', 'combined')}
              className="btn-outline w-full"
            >
              {copiedCommand === 'combined' ? '✅ Copied!' : '📋 Copy Command'}
            </button>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>Need GitHub CLI? Install it from <a href="https://cli.github.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">cli.github.com</a></p>
        </div>
      </section>

      {/* User Info Card */}
      {user ? (
        <div className="max-w-md mx-auto">
          <div className="bg-card rounded-lg shadow-lg p-6 space-y-4">
            <div className="flex items-center space-x-4">
              {user.pfpUrl && (
                <img
                  src={user.pfpUrl}
                  alt={user.displayName || user.username}
                  className="w-16 h-16 rounded-full"
                />
              )}
              <div>
                <h2 className="text-xl font-bold">{user.displayName || user.username}</h2>
                <p className="text-muted-foreground">@{user.username}</p>
                <p className="text-sm text-muted-foreground">FID: {user.fid}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <button
            onClick={handleSignIn}
            className="btn-primary px-8 py-3 text-lg"
          >
            Sign In with Farcaster
          </button>
        </div>
      )}

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <div className="bg-card rounded-lg p-6 space-y-3">
          <h3 className="text-xl font-semibold">📝 Compose Cast</h3>
          <p className="text-muted-foreground">Share your thoughts with the Farcaster community</p>
          <button
            onClick={handleComposeCast}
            className="btn-outline w-full"
            disabled={!isInMiniApp}
          >
            Compose New Cast
          </button>
        </div>

        <div className="bg-card rounded-lg p-6 space-y-3">
          <h3 className="text-xl font-semibold">⭐ Add to Favorites</h3>
          <p className="text-muted-foreground">Save this mini app to your favorites for quick access</p>
          <button
            onClick={handleAddMiniApp}
            className="btn-outline w-full"
            disabled={!isInMiniApp}
          >
            Add Mini App
          </button>
        </div>

        <div className="bg-card rounded-lg p-6 space-y-3">
          <h3 className="text-xl font-semibold">👤 View Profile</h3>
          <p className="text-muted-foreground">Explore user profiles on Farcaster</p>
          <button
            onClick={() => user && handleViewProfile(user.fid)}
            className="btn-outline w-full"
            disabled={!isInMiniApp || !user}
          >
            View My Profile
          </button>
        </div>

        <div className="bg-card rounded-lg p-6 space-y-3">
          <h3 className="text-xl font-semibold">🔗 External Links</h3>
          <p className="text-muted-foreground">Open external resources</p>
          <button
            onClick={() => handleOpenUrl('https://warpcast.com')}
            className="btn-outline w-full"
            disabled={!isInMiniApp}
          >
            Open Warpcast
          </button>
        </div>

        <div className="bg-card rounded-lg p-6 space-y-3">
          <h3 className="text-xl font-semibold">🎯 Quick Auth</h3>
          <p className="text-muted-foreground">Seamless authentication for Farcaster users</p>
          <div className="text-sm text-muted-foreground">
            {isInMiniApp ? '✅ Enabled' : '❌ Not in Mini App'}
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 space-y-3">
          <h3 className="text-xl font-semibold">🔔 Notifications</h3>
          <p className="text-muted-foreground">Send push notifications to users</p>
          <div className="text-sm text-muted-foreground">
            Webhook configured
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 space-y-3">
          <h3 className="text-xl font-semibold">⚡ Edge Runtime</h3>
          <p className="text-muted-foreground">Deployed globally on Cloudflare</p>
          <div className="text-sm text-muted-foreground">
            Sub-50ms response times
          </div>
        </div>
      </div>

      {/* Status Section */}
      <div className="max-w-2xl mx-auto text-center space-y-2 pt-8">
        <p className="text-sm text-muted-foreground">
          {isInMiniApp ? '🟢 Running inside Farcaster' : '🟡 Running in browser'}
        </p>
        <p className="text-sm text-muted-foreground">
           by uratmangun
        </p>
      </div>
    </div>
  );
}