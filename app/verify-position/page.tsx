import { Suspense } from 'react'
import VerifyPositionContent from './VerifyPositionContent'

export default function VerifyPositionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><p className="text-soft-500">Loading...</p></div>}>
      <VerifyPositionContent />
    </Suspense>
  )
}
