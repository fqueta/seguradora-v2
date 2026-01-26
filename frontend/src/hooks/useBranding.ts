
import { useState, useEffect } from 'react';
import { getBrandLogoUrl, hydrateBrandingFromPublicApi } from '@/lib/branding';

/**
 * useBranding
 * Hook to manage branding state dynamically.
 * Initializes from local storage/env, but also hydrates from API in background.
 */
export function useBranding() {
  const [logoUrl, setLogoUrl] = useState(getBrandLogoUrl());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      try {
        const { logoUrl: apiLogo } = await hydrateBrandingFromPublicApi({ persist: true });
        if (mounted && apiLogo && apiLogo !== logoUrl) {
          setLogoUrl(apiLogo);
        }
      } catch (e) {
        console.error('Failed to hydrate branding', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    hydrate();

    return () => {
      mounted = false;
    };
  }, []);

  return { logoUrl, isLoading };
}
