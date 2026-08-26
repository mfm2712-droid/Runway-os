export function DynamicIsland({ label }: { label: string }) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full bg-black/60 glass-strong">
        <span className="relative flex h-2 w-2">
          <span className="island-pulse absolute inline-flex h-full w-full rounded-full bg-mint-400" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-mint-400" />
        </span>
        <span className="text-[11px] font-medium text-slate-300 tracking-wide">{label}</span>
      </div>
    </div>
  );
}
