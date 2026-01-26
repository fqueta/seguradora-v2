import { useState, useEffect } from 'react';
import { getBrandLogoUrl, hydrateBrandingFromPublicApi } from '@/lib/branding';

/**
 * useBranding
 * Hook to manage branding state dynamically.
 * Prevents flashing of default logo by managing a resolving state.
 */
export function useBranding() {
  // Helper to get strictly cached logo (localStorage or window global)
  // Ignoring ENVs or defaults at this stage to prevent "old logo" flash
  const getCachedLogo = () => {
    if (typeof window === 'undefined') return null;
    try {
      const ls = localStorage.getItem('app_logo_url');
      if (ls && ls.trim()) return ls.trim();
      
      const anyWin = window as any;
      const win = anyWin.__APP_LOGO_URL__;
      if (typeof win === 'string' && win.trim()) return win.trim();
    } catch {}
    return null;
  };

  const getCachedName = () => {
    if (typeof window === 'undefined') return null;
    try {
      const ls = localStorage.getItem('app_institution_name');
      if (ls && ls.trim()) return ls.trim();

      const anyWin = window as any;
      const win = anyWin.__APP_INSTITUTION_NAME__;
      if (typeof win === 'string' && win.trim()) return win.trim();
    } catch {}
    return null;
  };

  const getCachedSlogan = () => {
    if (typeof window === 'undefined') return null;
    try {
      const ls = localStorage.getItem('app_institution_slogan');
      if (ls && ls.trim()) return ls.trim();
      const anyWin = window as any;
      const win = anyWin.__APP_INSTITUTION_SLOGAN__;
      if (typeof win === 'string' && win.trim()) return win.trim();
    } catch {}
    return null;
  };

  const cachedLogo = getCachedLogo();
  const cachedName = getCachedName();
  const cachedSlogan = getCachedSlogan();

  const [logoUrl, setLogoUrl] = useState<string | null>(cachedLogo);
  const [institutionName, setInstitutionName] = useState<string | null>(cachedName);
  const [institutionSlogan, setInstitutionSlogan] = useState<string | null>(cachedSlogan);

  // Consider resolved if we have cache, OR if hydration finishes
  const [isResolving, setIsResolving] = useState<boolean>(!cachedLogo && !cachedName);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      try {
        const { logoUrl: apiLogo, name: apiName, slogan: apiSlogan } = await hydrateBrandingFromPublicApi({ persist: true });
        
        if (mounted) {
          if (apiLogo) setLogoUrl(apiLogo);
          else if (!logoUrl) setLogoUrl(getBrandLogoUrl());

          if (apiName) setInstitutionName(apiName);
          else if (!institutionName) setInstitutionName('Ead Control'); // Default

          if (apiSlogan) setInstitutionSlogan(apiSlogan);
          // if no slogan, keep existing or null
        }
      } catch (e) {
        console.error('Failed to hydrate branding', e);
        if (mounted) {
           if (!logoUrl) setLogoUrl(getBrandLogoUrl());
           if (!institutionName) setInstitutionName('Ead Control');
        }
      } finally {
        if (mounted) setIsResolving(false);
      }
    }

    hydrate();

    return () => {
      mounted = false;
    };
  }, [logoUrl, institutionName, institutionSlogan]);

  return { logoUrl, institutionName, institutionSlogan, isResolving };
}
