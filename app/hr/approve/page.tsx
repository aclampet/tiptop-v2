import { Suspense } from 'react'
import HRApproveContent from './HRApproveContent'

export default function HRApprovePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><p className="text-soft-500">Loading...</p></div>}>
      <HRApproveContent />
    </Suspense>
  )
}
