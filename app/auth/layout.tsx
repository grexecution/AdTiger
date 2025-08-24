export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="light" style={{ colorScheme: 'light' }}>
      {children}
    </div>
  )
}