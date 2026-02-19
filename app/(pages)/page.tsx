import React from 'react'

// ── Hero ───────────────────────────────────────────────────
// MobileHero + DesktopHero are both exported from Hero.tsx
// and self-select via md:hidden / hidden md:flex internally.
import { Hero } from '../components/sections/Hero'

// ── News ───────────────────────────────────────────────────
// MobileNewsSection + DesktopNewsSection self-select via lg:hidden / hidden lg:block.
import { NewsSection } from '../components/sections/NewsSection'

// ── Match Schedule ─────────────────────────────────────────
// MobileMatchCard + DesktopMatchRow self-select via lg:hidden / hidden lg:block.
import { MatchSchedule } from '../components/sections/MatchSchedule'

// ── Scrim Vault + Best Role Awards ────────────────────────
// Desktop: ScrimVault + BestRoleAwards (hidden lg:block inside each)
// Mobile:  MobileScrimAndAwards      (lg:hidden inside it)
// All three must be rendered so the correct one shows per breakpoint.
import {
  ScrimVault,
  BestRoleAwards,
  MobileScrimAndAwards,
} from '../components/sections/ScrimVaultAwards'

function Home() {
  return (
    <div>
      {/* Self-switching: MobileHero md:hidden / DesktopHero hidden md:flex */}
      <Hero />

      {/* Self-switching: MobileNewsSection lg:hidden / DesktopNewsSection hidden lg:block */}
      <NewsSection />

      {/* Self-switching: MobileMatchCard lg:hidden / DesktopMatchRow hidden lg:block */}
      <MatchSchedule />

      {/* Mobile combined section — lg:hidden */}
      <MobileScrimAndAwards />

      {/* Desktop individual sections — hidden lg:block */}
      <ScrimVault />
      <BestRoleAwards />
    </div>
  )
}

export default Home