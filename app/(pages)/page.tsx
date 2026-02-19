import React from 'react'
import { Hero } from '../components/sections/Hero'
import { NewsSection } from '../components/sections/NewsSection'
import { MatchSchedule } from '../components/sections/MatchSchedule'
import { BestRoleAwards, ScrimVault } from '../components/sections/ScrimVaultAwards'

function Home() {
  return (
    <div>
      <Hero/>
      <NewsSection/>
      <MatchSchedule/>
      <ScrimVault/>
      <BestRoleAwards/>
    </div>
  )
}

export default Home
