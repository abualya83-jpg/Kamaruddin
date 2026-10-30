export default function SetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="card max-w-lg p-6 text-sm text-slate-700">
        <h1 className="mb-2 text-lg font-semibold text-slate-900">Supabase belum dikonfigurasi</h1>
        <p>
          Tetapkan <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_URL</code> dan{' '}
          <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_ANON_KEY</code> dalam fail{' '}
          <code className="rounded bg-slate-100 px-1">.env.local</code> (pembangunan) atau dalam
          Environment Variables projek Vercel, kemudian deploy semula.
        </p>
      </div>
    </div>
  )
}
