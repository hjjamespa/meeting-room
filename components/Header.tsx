'use client'

import { usePathname } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import { User } from 'lucide-react'

const pageTitle: Record<string, string> = {
  '/dashboard': '대시보드',
  '/rooms': '회의실 관리',
  '/sensors': '센서 관리',
  '/bookings': '예약 현황',
  '/noshows': 'No-show 이력',
  '/analytics': '이용률 분석',
  '/settings': '설정',
  '/security-logs': '보안 로그',
}

const roleLabels: Record<string, string> = {
  admin: '관리자',
  viewer: '일반 사용자',
}

const roleBadges: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  viewer: 'bg-blue-100 text-blue-700',
}

export default function Header() {
  const pathname = usePathname()
  const { user } = useUser()

  const title = pageTitle[pathname] || (pathname.startsWith('/dashboard/') ? '회의실 상세' : '회의실 관리 시스템')

  return (
    <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="pl-10 lg:pl-0">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-800">{title}</h2>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </p>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          <div className="flex items-center gap-2 lg:gap-3 pl-2 lg:pl-4">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-800">{user?.name || '로딩 중...'}</p>
              <div className="flex items-center gap-2">
                {user && (
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${roleBadges[user.role] || roleBadges.viewer}`}>
                    {roleLabels[user.role] || roleLabels.viewer}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
