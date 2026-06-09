import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/auth.js'
import { ApiError } from '@/api/client.js'
import QuestListPage from '@/pages/QuestList.js'
import LoginPage from '@/pages/Login.js'

function Nav() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.me(),
    retry: false,
    enabled: !!localStorage.getItem('token'),
  })

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch (_) {
      // ignore
    }
    localStorage.removeItem('token')
    queryClient.clear()
    navigate('/login')
  }

  return (
    <nav className="bg-gray-900 text-white px-6 py-3 flex items-center gap-6">
      <span className="font-bold text-lg tracking-tight">AdvancementQuesting</span>
      <NavLink
        to="/"
        className={({ isActive }) =>
          `text-sm ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`
        }
      >
        クエスト一覧
      </NavLink>
      <div className="ml-auto flex items-center gap-4">
        {me ? (
          <>
            <span className="text-sm text-gray-300">{me.playerName}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-white"
            >
              ログアウト
            </button>
          </>
        ) : (
          <NavLink
            to="/login"
            className={({ isActive }) =>
              `text-sm ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`
            }
          >
            ログイン
          </NavLink>
        )}
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<QuestListPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </main>
    </div>
  )
}
