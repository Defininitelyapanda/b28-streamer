export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-[calc(100vh-52px)] flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}
