import { Sun, Sparkles } from 'lucide-react';

export const ScanGuide: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6 z-10">
      {/* Top Header Tag */}
      <div className="pt-2 text-center">
        <span className="inline-flex items-center gap-1.5 bg-black/70 backdrop-blur-md text-emerald-300 text-xs font-bold px-3.5 py-1.5 rounded-full border border-emerald-500/30 shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          Align Package Declarations (MRP, Qty, Date)
        </span>
      </div>

      {/* Target Reticle */}
      <div className="w-full max-w-sm aspect-[4/3] border-2 border-emerald-400/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.58)] my-auto">
        {/* Corner Accents */}
        <div className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
        <div className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
        <div className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
        <div className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

        {/* Center alignment guide lines */}
        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-emerald-400/30 -translate-y-1/2" />
        <div className="absolute top-4 bottom-4 left-1/2 w-0.5 bg-emerald-400/20 -translate-x-1/2" />
      </div>

      {/* Bottom Best Practice Tips */}
      <div className="pb-16 flex flex-col items-center gap-1.5 text-center">
        <div className="inline-flex items-center gap-2 bg-black/75 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-2xl border border-white/15 shadow-xl">
          <Sun className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>Hold steady • Good lighting • Avoid flash glare • Sharp focus</span>
        </div>
      </div>
    </div>
  );
};
