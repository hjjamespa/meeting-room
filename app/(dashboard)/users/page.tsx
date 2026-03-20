'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/contexts/UserContext'
import { Users, Plus, Trash2, KeyRound, X, Mail, ClipboardCopy, Check, RefreshCw } from 'lucide-react'

interface Profile {
  id: string
  email: string
  name: string
  role: string
  created_at: string
}

interface CreatedAccount {
  name: string
  email: string
  password: string
}

export default function UsersPage() {
  const { user } = useUser()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'viewer' })
  const [createdAccount, setCreatedAccount] = useState<CreatedAccount | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) setUsers(await res.json())
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  useEffect(() => { void loadUsers() }, [])

  if (user?.role !== 'admin') {
    return <div className="text-center py-20 text-gray-500">관리자 권한이 필요합니다.</div>
  }

  const handleCopy = async (text: string, fieldKey: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(fieldKey)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleCopyAccountInfo = async (email: string, password: string, userName: string) => {
    const siteUrl = window.location.origin
    const invitationText = `━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 회의실 관리 시스템 계정 안내
━━━━━━━━━━━━━━━━━━━━━━━━━━━

안녕하세요${userName ? ` ${userName}님` : ''},

회의실 관리 시스템 계정이 생성되었습니다.
아래 정보로 로그인하실 수 있습니다.

🔗 접속 URL
${siteUrl}/login

👤 로그인 정보
• 아이디: ${email}
• 비밀번호: ${password}

🔒 비밀번호 변경 방법
로그인 후 좌측 메뉴 [설정]에서
비밀번호를 변경하실 수 있습니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    await handleCopy(invitationText, 'all')
  }

  const handleCopyInvitation = async (u: Profile) => {
    const newPassword = prompt('초대장에 포함할 임시 비밀번호 (8자 이상, 영문+숫자):')
    if (!newPassword) return
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password', userId: u.id, newPassword }),
      })
      if (res.ok) {
        await handleCopyAccountInfo(u.email, newPassword, u.name)
        alert('비밀번호가 초기화되고 초대장이 복사되었습니다.')
      } else {
        const data = await res.json()
        alert(data.error)
      }
    } catch (err) { console.error(err) }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...form }),
      })
      if (res.ok) {
        setCreatedAccount({ name: form.name, email: form.email, password: form.password })
        setShowForm(false)
        setForm({ name: '', email: '', password: '', role: 'viewer' })
        await loadUsers()
      } else {
        const data = await res.json()
        alert(data.error)
      }
    } catch (err) { console.error(err) }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_role', userId, role: newRole }),
      })
      await loadUsers()
    } catch (err) { console.error(err) }
  }

  const handleResetPassword = async (userId: string) => {
    const newPassword = prompt('새 비밀번호를 입력하세요 (8자 이상, 영문+숫자):')
    if (!newPassword) return
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password', userId, newPassword }),
      })
      if (res.ok) alert('비밀번호가 변경되었습니다.')
      else { const d = await res.json(); alert(d.error) }
    } catch (err) { console.error(err) }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('이 사용자를 삭제하시겠습니까?')) return
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', userId }),
      })
      await loadUsers()
    } catch (err) { console.error(err) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" /> 사용자 추가
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">새 사용자 추가</h2>
            <button onClick={() => setShowForm(false)}>
              <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일 *</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 *</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">역할</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="viewer">일반 사용자</option>
                <option value="admin">관리자</option>
              </select>
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">추가</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">취소</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-500">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
          <p>데이터를 불러오는 중...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">이름</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">이메일</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">역할</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">생성일</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{u.name}</td>
                  <td className="px-6 py-4 text-gray-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="text-xs px-2 py-1 border border-gray-200 rounded"
                      disabled={u.id === user?.id}
                    >
                      <option value="viewer">일반 사용자</option>
                      <option value="admin">관리자</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{new Date(u.created_at).toLocaleDateString('ko-KR')}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleCopyInvitation(u)} className="p-1 text-gray-400 hover:text-violet-600 mr-2" title="초대장 복사">
                      {copiedField === u.email ? <Check className="w-4 h-4 text-green-500" /> : <Mail className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleResetPassword(u.id)} className="p-1 text-gray-400 hover:text-blue-600 mr-2" title="비밀번호 초기화">
                      <KeyRound className="w-4 h-4" />
                    </button>
                    {u.id !== user?.id && (
                      <button onClick={() => handleDelete(u.id)} className="p-1 text-gray-400 hover:text-red-600" title="삭제">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 계정 초대장 모달 */}
      {createdAccount && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setCreatedAccount(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-gray-900">계정 생성 완료</h3>
              <button onClick={() => setCreatedAccount(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">{createdAccount.name}님의 계정이 생성되었습니다. 초대장을 복사하여 전달해주세요.</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-xs text-gray-400">아이디 (이메일)</p>
                    <p className="text-sm font-medium text-gray-900">{createdAccount.email}</p>
                  </div>
                  <button onClick={() => handleCopy(createdAccount.email, 'email')} className="p-2 hover:bg-gray-200 rounded-lg transition" title="이메일 복사">
                    {copiedField === 'email' ? <Check className="w-4 h-4 text-green-500" /> : <ClipboardCopy className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-xs text-gray-400">비밀번호</p>
                    <p className="text-sm font-medium text-gray-900">{createdAccount.password}</p>
                  </div>
                  <button onClick={() => handleCopy(createdAccount.password, 'password')} className="p-2 hover:bg-gray-200 rounded-lg transition" title="비밀번호 복사">
                    {copiedField === 'password' ? <Check className="w-4 h-4 text-green-500" /> : <ClipboardCopy className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>
              <button
                onClick={() => handleCopyAccountInfo(createdAccount.email, createdAccount.password, createdAccount.name)}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm flex items-center justify-center gap-2"
              >
                {copiedField === 'all' ? <Check className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                초대장 복사
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
