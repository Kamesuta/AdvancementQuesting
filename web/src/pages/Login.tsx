import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/auth.js'
import { ApiError } from '@/api/client.js'

export default function LoginPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await authApi.loginWithCode({ code })
      localStorage.setItem('token', res.token)
      queryClient.invalidateQueries({ queryKey: ['me'] })
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ログインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16">
      <h1 className="text-2xl font-bold mb-6">ログイン</h1>
      <p className="text-gray-400 text-sm mb-6">
        Minecraft で <code className="bg-gray-800 px-1 rounded">/quest code</code> を実行して
        表示された6桁のコードを入力してください。
      </p>
      <p className="text-gray-500 text-xs mb-6">
        開発用: コード <code className="bg-gray-800 px-1 rounded">123456</code>
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456"
          maxLength={6}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-blue-500"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={code.length !== 6 || loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg py-3 font-medium transition-colors"
        >
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>
    </div>
  )
}
