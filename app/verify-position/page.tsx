import { Suspense } from 'react'
import VerifyPositionContent from './VerifyPositionContent'

export default function VerifyPositionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink-950 flex items-center justify-center"><p className="text-ink-400">Loading...</p></div>}>
      <VerifyPositionContent />
    </Suspense>
  )
}
