'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type HeroCatalogItem = { id: string; key: string; name: string; imageUrl: string };

type HeroContextValue = {
  heroImage: string | null;
  loading: boolean;
  heroCatalog: HeroCatalogItem[];
  selectedKey: string | null;
  selectHero: (hero: HeroCatalogItem) => Promise<void>;
};

const HeroContext = createContext<HeroContextValue | undefined>(undefined);

export const HeroProvider = ({ children }: { children: React.ReactNode }) => {
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [heroCatalog, setHeroCatalog] = useState<HeroCatalogItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [catalogResp, profileResp] = await Promise.all([
          fetch('/api/heroes/catalog', { cache: 'no-store' }),
          fetch('/api/users/profile', { cache: 'no-store' }),
        ]);

        let heroes: HeroCatalogItem[] = [];
        if (catalogResp.ok) {
          const catalogData = await catalogResp.json();
          heroes = Array.isArray(catalogData?.heroes) ? catalogData.heroes : [];
          setHeroCatalog(heroes);
        }

        const fallbackImage: string | null = heroes[0]?.imageUrl ?? null;
        const fallbackKey: string | null = heroes[0]?.key ?? null;

        if (profileResp.ok) {
          const profileData = await profileResp.json();
          const favorite = typeof profileData?.favoriteHero === 'string' ? profileData.favoriteHero : null;
          if (favorite && heroes.length > 0) {
            const selected = heroes.find(h => h.key === favorite);
            if (selected) {
              setSelectedKey(selected.key);
              setHeroImage(selected.imageUrl);
              setLoading(false);
              return;
            }
          }
        }

        // fallback to first hero in catalog
        setSelectedKey(fallbackKey);
        setHeroImage(fallbackImage);
      } catch {
        setHeroImage(null);
      } finally {
        setLoading(false);
      }
    };

    load().catch(() => setLoading(false));
  }, []);

  const selectHero = async (hero: HeroCatalogItem) => {
    setSelectedKey(hero.key);
    setHeroImage(hero.imageUrl);
    try {
      await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favoriteHero: hero.key }),
      });
    } catch {
      // ignore save errors; UI already updated optimistically
    }
  };

  return (
    <HeroContext.Provider value={{ heroImage, loading, heroCatalog, selectedKey, selectHero }}>
      {children}
    </HeroContext.Provider>
  );
};

export const useHero = () => {
  const ctx = useContext(HeroContext);
  if (!ctx) throw new Error('useHero must be used within HeroProvider');
  return ctx;
};
