import type { Metadata } from 'next'
import StandalonePage from '@/components/layout/StandalonePage'
import HelpCenter from '@/components/account/HelpCenter'

export const metadata: Metadata = { title: 'Help & support' }

export default function HelpPage() {
  return (
    <StandalonePage title='Help & chat support' description='Get answers or reach our support team.' crumb='Help & chat support'>
      <HelpCenter />
    </StandalonePage>
  )
}
