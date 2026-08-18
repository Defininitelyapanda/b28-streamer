export function PlaceholderPage({ title, phase }: { title: string; phase: string }) {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-white">{title}</h1>
      <div className="mt-8 rounded-xl border border-dashed border-surface-border bg-surface-card p-12 text-center">
        <p className="text-lg text-gray-300">Coming soon</p>
        <p className="mt-2 text-sm text-gray-500">
          This section will be available in {phase}. The backend API module is not yet implemented.
        </p>
      </div>
    </div>
  );
}
