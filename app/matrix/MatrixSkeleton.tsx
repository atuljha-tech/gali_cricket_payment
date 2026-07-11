export default function MatrixSkeleton() {
  return (
    <div className="space-y-5">
      {/* Summary card skeletons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-5">
            <div className="skeleton h-10 w-10 rounded-xl mb-4" />
            <div className="skeleton h-7 w-2/3 rounded mb-2" />
            <div className="skeleton h-3 w-1/2 rounded" />
          </div>
        ))}
      </div>
      {/* Grid skeleton */}
      <div className="card p-4">
        <div className="overflow-hidden">
          <div className="skeleton h-9 w-full rounded-lg mb-2" />
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex gap-1.5 mb-1.5">
              <div className="skeleton h-9 w-32 rounded-lg flex-shrink-0" />
              {[...Array(12)].map((_, j) => (
                <div key={j} className="skeleton h-9 flex-1 rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
