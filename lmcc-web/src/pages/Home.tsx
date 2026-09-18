import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, UploadCloud, ShieldCheck, Scale, AlertCircle, FileCheck2, ChevronRight, History as HistoryIcon } from 'lucide-react';

export const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white flex flex-col justify-between">
      {/* Top Government-style Header Bar */}
      <header className="bg-gov-800 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Scale className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-wide">LMCC</h1>
                <span className="text-[10px] bg-amber-400 text-gov-900 font-bold px-2 py-0.5 rounded-full uppercase">
                  SIH26034
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Department of Consumer Affairs • Team JAMH X4
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/history')}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 py-1.5 px-3 rounded-lg border border-white/10 transition"
              aria-label="View Report History"
            >
              <HistoryIcon className="w-3.5 h-3.5 text-amber-300" />
              <span>History</span>
            </button>
            <div className="hidden sm:block text-right border-l border-white/10 pl-2">
              <span className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Rules 2011
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="max-w-lg w-full mx-auto px-4 py-8 flex-1 flex flex-col justify-center">
        {/* Title & Introduction */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gov-50 border border-gov-200 text-gov-700 text-xs font-semibold mb-4">
            <FileCheck2 className="w-3.5 h-3.5 text-gov-600" />
            <span>Automated Package Label Screening</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
            Legal Metrology Compliance Checker
          </h2>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            Scan any packaged commodity label to verify mandatory Rule 6 declarations: MRP, Net Quantity, Dates, Manufacturer & Consumer Care contacts.
          </p>
        </div>

        {/* Action Cards */}
        <div className="space-y-3.5">
          {/* Primary CTA: Camera Scan */}
          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="w-full bg-gradient-to-r from-gov-700 via-gov-600 to-emerald-700 hover:from-gov-800 hover:to-emerald-800 text-white p-5 rounded-2xl shadow-xl shadow-gov-900/15 flex items-center justify-between group transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="w-13 h-13 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center p-3 text-amber-300">
                <Camera className="w-7 h-7" />
              </div>
              <div className="text-left">
                <span className="text-xs uppercase tracking-wider text-emerald-200 font-bold block">
                  Recommended
                </span>
                <span className="text-lg font-bold block">Scan Product Label</span>
                <span className="text-xs text-white/80">Use phone camera with live targeting</span>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-white/70 group-hover:translate-x-1 transition" />
          </button>

          {/* Secondary CTA: Image Upload */}
          <button
            type="button"
            onClick={() => navigate('/scan?mode=upload')}
            className="w-full bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-gov-500 text-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between group transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="w-13 h-13 rounded-xl bg-slate-100 flex items-center justify-center p-3 text-gov-600">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div className="text-left">
                <span className="text-lg font-bold block text-slate-900">Upload Label Image</span>
                <span className="text-xs text-slate-500">Select photo from your device or gallery</span>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-slate-400 group-hover:translate-x-1 transition" />
          </button>

          {/* Tertiary CTA: Report History */}
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 p-4 rounded-2xl shadow-xs flex items-center justify-between group transition-all duration-150 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-xs">
                <HistoryIcon className="w-5 h-5 text-gov-700" />
              </div>
              <div className="text-left">
                <span className="text-sm font-bold text-slate-800 block">Report History</span>
                <span className="text-xs text-slate-500">View previously screened packaged commodities</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-0.5 transition" />
          </button>
        </div>


        {/* Mandatory Declarations Quick List */}
        <div className="mt-8 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-gov-600" />
            Mandatory Declarations Checked (Rule 6)
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>MRP (incl. all taxes)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Net Weight / Volume</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>MFD / PKD Date</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Manufacturer Details</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Consumer Care Info</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Premises / Address</span>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="mt-6 flex items-start gap-2 text-[11px] text-slate-500 bg-slate-100/80 p-3 rounded-xl">
          <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Disclaimer:</strong> LMCC is an automated consumer assistance screening tool. It operates client-side and does not issue legal determinations.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-400 border-t border-slate-200">
        SIH 2026 • Problem SIH26034 • Ministry of Consumer Affairs
      </footer>
    </div>
  );
};
