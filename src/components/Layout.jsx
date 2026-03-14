import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {/* pt-12 on mobile for top bar, pb-16 for bottom nav */}
      <main className="flex-1 overflow-auto pt-12 pb-16 md:pt-0 md:pb-0">
        {children}
      </main>
    </div>
  )
}
