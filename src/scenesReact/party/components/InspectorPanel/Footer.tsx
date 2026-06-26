// -----------------------------
// 3. FOOTER COMPONENT
// -----------------------------
export function InspectorFooter() {
  return (
    <div className="p-4 border-t border-slate-800 bg-slate-900/80">
      <div className="text-xs text-slate-500 font-bold tracking-wider mb-3">QUICK ACTIONS</div>
      <div className="flex gap-4">
        <button className="flex items-center gap-3 bg-slate-900 border border-slate-800 hover:border-purple-500/50 px-4 py-2 rounded-lg transition-colors group">
          <kbd className="w-6 h-6 flex items-center justify-center bg-slate-950 border border-purple-500/30 text-purple-400 rounded text-xs font-mono group-hover:bg-purple-500/10 transition-colors">
            E
          </kbd>
          <span className="text-slate-300 text-sm font-medium">Shift Position</span>
        </button>
        <button className="flex items-center gap-3 bg-slate-900 border border-slate-800 hover:border-purple-500/50 px-4 py-2 rounded-lg transition-colors group">
          <kbd className="w-6 h-6 flex items-center justify-center bg-slate-950 border border-purple-500/30 text-purple-400 rounded text-xs font-mono group-hover:bg-purple-500/10 transition-colors">
            F
          </kbd>
          <span className="text-slate-300 text-sm font-medium">Give / Take Item</span>
        </button>
        <button className="flex items-center gap-3 bg-slate-900 border border-slate-800 hover:border-red-500/50 px-4 py-2 rounded-lg transition-colors group ml-auto">
          <kbd className="w-8 h-6 flex items-center justify-center bg-slate-950 border border-red-500/30 text-red-400 rounded text-xs font-mono group-hover:bg-red-500/10 transition-colors">
            Del
          </kbd>
          <span className="text-slate-300 text-sm font-medium">Send to PC</span>
        </button>
      </div>
    </div>
  );
}
