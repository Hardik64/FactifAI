// src/components/LoadingSkeleton.jsx
export default function LoadingSkeleton({ query }) {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Query echo */}
      <div className="flex justify-end">
        <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-br-sm text-sm opacity-60"
          style={{ background: "var(--accent)", color: "white" }}>
          {query}
        </div>
      </div>

      {/* Skeleton card */}
      <div className="card p-5 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full shimmer shrink-0" />
          <div className="flex-1 space-y-2 pt-2">
            <div className="h-6 w-24 rounded-full shimmer" />
            <div className="h-4 w-full rounded-lg shimmer" />
            <div className="h-4 w-2/3 rounded-lg shimmer" />
          </div>
        </div>

        <hr style={{ borderColor: "var(--border)" }} />

        <div className="grid grid-cols-2 gap-4">
          <div className="h-28 rounded-xl shimmer" />
          <div className="h-28 rounded-xl shimmer" />
        </div>

        <div className="space-y-3">
          <div className="h-3 w-32 rounded shimmer" />
          <div className="h-4 rounded-lg shimmer" />
          <div className="h-4 w-5/6 rounded-lg shimmer" />
          <div className="h-4 w-4/6 rounded-lg shimmer" />
        </div>

        <div className="flex items-center gap-2 mt-2">
          <div className="w-3 h-3 rounded-full bg-orange-400 animate-pulse" />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Analyzing with AI...
          </span>
        </div>
      </div>
    </div>
  );
}
