export function LoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-lg border border-ink-100 bg-white shadow-card"
        >
          <div className="aspect-[4/3] w-full bg-stone-200" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-3/4 rounded bg-stone-200" />
            <div className="h-3 w-1/2 rounded bg-stone-200" />
            <div className="h-3 w-full rounded bg-stone-200" />
            <div className="h-5 w-1/3 rounded bg-stone-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LoadingRow() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 rounded-md bg-stone-100" />
      ))}
    </div>
  );
}
