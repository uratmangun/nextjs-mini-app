'use client';

import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfp?: string;
}

export function FarcasterProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [isInMiniApp, setIsInMiniApp] = useState(false);

  useEffect(() => {
    // Check for skip parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const shouldSkip = urlParams.get('skip') === 'true';

    if (shouldSkip) {
      console.log('Skipping Farcaster initialization due to skip=true parameter');
      setIsReady(true);
      return;
    }

    const initializeFarcaster = async () => {
      try {
        // Check if we're in a Farcaster mini app context
        const inMiniApp = await sdk.isInMiniApp();
        setIsInMiniApp(inMiniApp);

        if (inMiniApp) {
          // Get context including user info
          const context = await sdk.context;
          if (context?.user) {
            setUser({
              fid: context.user.fid,
              username: context.user.username,
              displayName: context.user.displayName,
              pfp: context.user.pfpUrl,
            });
          }
        }

        // Signal that the app is ready (hides splash screen)
        await sdk.actions.ready();
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize Farcaster SDK:', error);
        setIsReady(true); // Still mark as ready even if initialization fails
      }
    };

    initializeFarcaster();
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading Farcaster Mini App...</p>
          <button 
            onClick={() => setIsReady(true)}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Skip Loading
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
