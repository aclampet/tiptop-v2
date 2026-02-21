import { Suspense } from 'react'
import HRApproveContent from './HRApproveContent'

export default function HRApprovePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink-950 flex items-center justify-center"><p className="text-ink-400">Loading...</p></div>}>
      <HRApproveContent />
    </Suspense>
  )
}
