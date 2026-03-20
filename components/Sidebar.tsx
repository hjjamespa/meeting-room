'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { auth } from '@/lib/api'
import { useUser } from '@/contexts/UserContext'
import {
  LayoutDashboard,
  DoorOpen,
  Wifi,
  Calendar,
  UserX,
  BarChart3,
  Settings,
  Users,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  User,
} from 'lucide-react'

const menuItems = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/rooms', label: '회의실 관리', icon: DoorOpen },
  { href: '/sensors', label: '센서 관리', icon: Wifi },
  { href: '/bookings', label: '예약 현황', icon: Calendar },
  { href: '/noshows', label: 'No-show 이력', icon: UserX },
  { href: '/analytics', label: '이용률 분석', icon: BarChart3 },
  { href: '/account', label: '내 계정', icon: User },
]

const adminOnlyItems = [
  { href: '/settings', label: '설정', icon: Settings },
  { href: '/users', label: '사용자 관리', icon: Users },
  { href: '/security-logs', label: '보안 로그', icon: ShieldAlert },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useUser()
  const userRole = user?.role || 'viewer'
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = useCallback(() => setIsOpen((v) => !v), [])
  const closeMenu = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  const handleLogout = useCallback(async () => {
    await auth.logout()
    closeMenu()
    router.replace('/login')
  }, [closeMenu, router])

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <>
      <button
        onClick={toggleMenu}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-lg shadow-lg"
        aria-label="메뉴 열기"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={closeMenu} />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-gray-900 text-white min-h-screen flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Link
          href="/dashboard"
          className="block p-6 border-b border-gray-800 hover:bg-gray-800 transition cursor-pointer"
        >
          <h1 className="text-xl font-bold flex items-center gap-2">
            <DoorOpen className="w-6 h-6 text-blue-400" />
            회의실 관리
          </h1>
        </Link>

        <nav className="p-4 flex-1 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                      active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>

          {userRole === 'admin' && (
            <>
              <div className="my-4 border-t border-gray-700" />
              <p className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wider">관리자</p>
              <ul className="space-y-2">
                {adminOnlyItems.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                          active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          <ul className="space-y-2 mt-4">
            <li>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 w-full text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
                로그아웃
              </button>
            </li>
          </ul>
        </nav>

        {user && (
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
