'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/supabase/client'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-3 px-4 py-3 rounded-lg text-navy-600/70 hover:bg-soft-100 hover:text-navy-600 transition-all w-full text-left"
    >
      <span className="text-xl">🚪</span>
      <span>Sign out</span>
    </button>
  )
}
