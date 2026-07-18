import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { loggedOut } from '@/features/auth/authSlice'

export default function Topbar() {
  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-white border-b border-gray-200">
      <div />
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-sm text-gray-600">
            {user.name} <span className="text-gray-400">({user.role})</span>
          </span>
        )}
        <button
          onClick={() => {
            dispatch(loggedOut())
            navigate('/login', { replace: true })
          }}
          className="text-sm text-indigo-600 hover:underline"
        >
          Log out
        </button>
      </div>
    </header>
  )
}
