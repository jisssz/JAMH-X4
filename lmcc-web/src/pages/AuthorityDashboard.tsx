import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  BarChart3,
  TrendingUp,
  Download,
  RefreshCw,
  Info,
  Layers,
  Building2,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  getAnalyticsSummary,
  getAnalyticsIssues,
  getAnalyticsCategories,
  getAnalyticsTrends,
  getAnalyticsBrands,
  AnalyticsSummary,
  IssuesBreakdown,
  CategoriesBreakdown,
  TrendsResponse,
  BrandsResponse,
} from '../services/api';
import GlowBackground from '../components/ui/GlowBackground';
import ZenoxNav from '../components/ui/ZenoxNav';

export const AuthorityDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [useDemoData, setUseDemoData] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [issues, setIssues] = useState<IssuesBreakdown | null>(null);
  const [categories, setCategories] = useState<CategoriesBreakdown | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [brands, setBrands] = useState<BrandsResponse | null>(null);

  const fetchAllAnalytics = useCallback(async (demoMode: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, issRes, catRes, trnRes, brnRes] = await Promise.all([
        getAnalyticsSummary(demoMode),
        getAnalyticsIssues(demoMode),
        getAnalyticsCategories(demoMode),
        getAnalyticsTrends(demoMode),
        getAnalyticsBrands(demoMode),
      ]);
      setSummary(sumRes);
      setIssues(issRes);
      setCategories(catRes);
      setTrends(trnRes);
      setBrands(brnRes);
    } catch (err: any) {
      console.warn('Analytics fetch error:', err);
      setError(
        err.message || 'Unable to connect to live analytics API. Displaying illustrative pilot data.'
      );
      // Fallback to demo mode if live fetch failed
      if (!demoMode) {
        setUseDemoData(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllAnalytics(useDemoData);
  }, [useDemoData, fetchAllAnalytics]);

  const handleExportCSV = () => {
    if (!summary || !issues) return;

    const rows: string[][] = [
      ['LMCC Legal Metrology Market Surveillance Intelligence Export'],
      ['Generated At', new Date().toISOString()],
      ['Data Source', summary.isDemonstrationData ? 'Illustrative Pilot Dataset' : 'Live Screening Registry'],
      [''],
      ['SUMMARY METRICS'],
      ['Total Screenings', summary.totalScans.toString()],
      ['Compliant (PASS)', summary.passCount.toString()],
      ['Advisory Review (REVIEW)', summary.reviewCount.toString()],
      ['Compliance Pass Rate', `${summary.passRate}%`],
      ['Total Statutory Issues Identified', summary.totalIssues.toString()],
      [''],
      ['STATUTORY DEFECT FREQUENCY (RULE 6 DISTRIBUTION)'],
      ['Statutory Field', 'Gazette Rule Reference', 'Occurrences', 'Share (%)'],
      ...issues.items.map((i) => [i.field, i.ruleReference, i.count.toString(), `${i.percentage}%`]),
      [''],
      ['COMMODITY CATEGORY BREAKDOWN'],
      ['Category', 'Screenings', 'Reviews Flagged', 'Review Rate (%)'],
      ...(categories?.items.map((c) => [c.category, c.screenings.toString(), c.reviewCount.toString(), `${c.reviewRate}%`]) || []),
      [''],
      ['MANUFACTURER SURVEILLANCE FREQUENCY (ADVISORY OBSERVATIONS)'],
      ['Manufacturer / Label', 'Screenings Observed', 'Reviews Flagged', 'Review Rate (%)'],
      ...(brands?.items.map((b) => [b.manufacturer, b.screenings.toString(), b.reviewCount.toString(), `${b.reviewRate}%`]) || []),
      [''],
      ['DISCLAIMER'],
      ['Observations represent crowdsourced automated consumer screenings under LM PCR 2011. Does not constitute official judicial finding.'],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LMCC_Surveillance_Intelligence_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isDemo = summary?.isDemonstrationData ?? useDemoData;

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white pb-20">
      <GlowBackground />
      <ZenoxNav />

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 space-y-8">
        {/* Top Header & Breadcrumbs */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-2">
              <button
                onClick={() => navigate('/')}
                className="hover:underline flex items-center gap-1 text-slate-400 hover:text-white transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Home
              </button>
              <span>/</span>
              <span>MARKET SURVEILLANCE INTELLIGENCE</span>
              <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full">
                SIH26034
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-emerald-400" />
              <span>Authority & Crowd Surveillance Dashboard</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Real-time aggregated intelligence on Legal Metrology (Packaged Commodities) compliance patterns, mandatory declaration omissions, and market trends across pre-packaged goods.
            </p>
          </div>

          {/* Top Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Demo / Live Toggle */}
            <div className="flex items-center bg-slate-900 border border-white/10 rounded-xl p-1 text-xs font-mono">
              <button
                onClick={() => setUseDemoData(false)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  !useDemoData
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Live Registry
              </button>
              <button
                onClick={() => setUseDemoData(true)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  useDemoData
                    ? 'bg-sky-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Pilot Demo (1,420 Scans)
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchAllAnalytics(useDemoData)}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-50"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              disabled={loading || !summary}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-bold text-white transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Zero PII & Statutory Scope Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-bold text-emerald-300 flex items-center gap-2">
                <span>STRICT ZERO-PII ARCHITECTURE</span>
                <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.2 rounded font-mono">
                  PRIVACY BY DESIGN
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                LMCC aggregates only anonymous statutory packaging attributes (Rule 6 declarations, detected values, and gazette defect codes). No consumer names, mobile numbers, IP addresses, GPS coordinates, or packaging photos are stored or transmitted.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex items-start gap-3">
            <Lock className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-bold text-slate-200">DATASET CLASSIFICATION</div>
              <p className="text-slate-400 leading-relaxed">
                {isDemo ? (
                  <span className="text-sky-300 font-mono font-medium">
                    Illustrative Demonstration Dataset (1,420 pilot multi-district screenings for SIH Evaluation).
                  </span>
                ) : (
                  <span className="text-emerald-300 font-mono font-medium">
                    Live production SQLite registry synchronized from active consumer edge screenings.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Dataset Status Banner */}
        {isDemo ? (
          <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/40 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 shrink-0 font-bold font-mono">
                DEMO
              </div>
              <div>
                <span className="font-bold text-sky-200">
                  DEMONSTRATION / PILOT BENCHMARK DATASET (1,420 Screenings)
                </span>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Illustrative pilot surveillance data compiled across 5 commodity sectors for SIH Evaluation. Does not represent unverified live user scans.
                </p>
              </div>
            </div>
            <button
              onClick={() => setUseDemoData(false)}
              className="hidden sm:inline-flex px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold font-mono text-[11px] transition shrink-0 cursor-pointer"
            >
              Switch to Live Registry
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 font-bold font-mono">
                LIVE
              </div>
              <div>
                <span className="font-bold text-emerald-200">
                  LIVE SCREENED REGISTRY DATA
                </span>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Real-time aggregated compliance observations submitted and synced by client devices.
                </p>
              </div>
            </div>
            <button
              onClick={() => setUseDemoData(true)}
              className="hidden sm:inline-flex px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-[11px] transition shrink-0 cursor-pointer"
            >
              View Pilot Benchmark (1,420)
            </button>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 4 Core KPI Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Screenings */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>TOTAL SCREENINGS</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {loading ? '...' : summary?.totalScans.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Pre-packaged commodities screened
            </p>
          </div>

          {/* Card 2: Compliant Pass Rate */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-emerald-400">
              <span>COMPLIANCE RATE</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">
              {loading ? '...' : `${summary?.passRate}%`}
            </div>
            <p className="text-[11px] text-slate-400">
              {loading ? '...' : `${summary?.passCount.toLocaleString()} products fully compliant`}
            </p>
          </div>

          {/* Card 3: Advisory Reviews */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-amber-400">
              <span>ADVISORY REVIEWS</span>
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-amber-400 tracking-tight">
              {loading ? '...' : summary?.reviewCount.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400">
              {loading
                ? '...'
                : `${(((summary?.reviewCount || 0) / (summary?.totalScans || 1)) * 100).toFixed(1)}% flagged for review`}
            </p>
          </div>

          {/* Card 4: Total Issues Detected */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-rose-400">
              <span>STATUTORY ISSUES</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-rose-400 tracking-tight">
              {loading ? '...' : summary?.totalIssues.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400">Rule 6 statutory omissions observed</p>
          </div>
        </div>

        {/* Section 2: Statutory Non-Compliance Breakdown (Rule 6 Distribution) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-md space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Statutory Defect Distribution (Rule 6)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Most frequent statutory omissions detected across screened labels
                </p>
              </div>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-white/10">
                PCR 2011
              </span>
            </div>

            <div className="space-y-3.5">
              {issues?.items.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-200">{item.field}</span>
                    <span className="font-mono text-slate-400">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-800/80 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        idx === 0
                          ? 'bg-rose-500'
                          : idx === 1
                          ? 'bg-amber-500'
                          : idx === 2
                          ? 'bg-sky-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(item.percentage * 2.5, 100)}%` }}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 flex justify-between">
                    <span>Reference: {item.ruleReference}</span>
                  </div>
                </div>
              ))}
              {(!issues || issues.items.length === 0) && !loading && (
                <div className="text-center py-6 text-xs text-slate-500">
                  No statutory defects recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Commodity Category Distribution */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-md space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-400" />
                  <span>Commodity Sector Screening Volume</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pre-packaged product classes and associated review rates
                </p>
              </div>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-white/10">
                SECTORIAL
              </span>
            </div>

            <div className="space-y-3">
              {categories?.items.map((cat, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between hover:border-white/10 transition"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-white">{cat.category}</div>
                    <div className="text-[11px] text-slate-400">
                      {cat.screenings.toLocaleString()} screenings &bull; {cat.reviewCount} reviews
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-xs font-mono font-bold ${
                        cat.reviewRate > 25 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {cat.reviewRate}%
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">review rate</div>
                  </div>
                </div>
              ))}
              {(!categories || categories.items.length === 0) && !loading && (
                <div className="text-center py-6 text-xs text-slate-500">
                  No category records available.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Screening Trends Over Time */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Screening Volume & Advisory Trajectory</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Surveillance throughput and advisory review proportions over observation intervals
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded">
              Monthly Aggregation
            </span>
          </div>

          <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {trends?.items.map((t, idx) => {
              const reviewPct = t.scans > 0 ? Math.round((t.reviews / t.scans) * 100) : 0;
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/5 space-y-2 text-center"
                >
                  <div className="text-[11px] font-mono text-slate-400">{t.period}</div>
                  <div className="text-lg font-black text-white">{t.scans}</div>
                  <div className="text-[10px] font-mono text-amber-400 bg-amber-400/10 py-0.5 rounded">
                    {t.reviews} reviews ({reviewPct}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 4: Brand / Manufacturer Surveillance Table */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-400" />
                <span>Manufacturer Surveillance Observations</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Frequency of advisory review recommendations across declared brands and regional packers
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-white/5">
              <Info className="w-3.5 h-3.5 text-sky-400" />
              <span>Advisory Screenings Only &bull; Non-Defamatory</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="py-2.5 px-3">Manufacturer / Declared Brand</th>
                  <th className="py-2.5 px-3 text-right">Screenings</th>
                  <th className="py-2.5 px-3 text-right">Reviews Flagged</th>
                  <th className="py-2.5 px-3 text-right">Review Rate</th>
                  <th className="py-2.5 px-3 text-center">Screening Distribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {brands?.items.map((b, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-600" />
                      {b.manufacturer}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">
                      {b.screenings.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-400">
                      {b.reviewCount}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-200">
                      {b.reviewRate}%
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          b.reviewRate <= 20
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : b.reviewRate <= 35
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        }`}
                      >
                        {b.reviewRate <= 20
                          ? 'Standard Distribution'
                          : b.reviewRate <= 35
                          ? 'Moderate Review Frequency'
                          : 'Higher Review Frequency'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-slate-400 italic pt-2">
            Surveillance metrics represent crowdsourced automated consumer screenings. Review frequency indicates automated screening outcomes and does not establish legal non-compliance or judicial liability.
          </p>
        </div>

        {/* Statutory Regulatory Framework Footer Box */}
        <div className="p-5 rounded-2xl bg-slate-950/70 border border-white/10 text-xs space-y-2 text-slate-400">
          <div className="font-bold text-slate-200 flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>STATUTORY REGULATORY BENCHMARK: LEGAL METROLOGY ACT, 2009</span>
          </div>
          <p className="leading-relaxed">
            All automated screening rules implemented in the LMCC engine derive strictly from the Legal Metrology (Packaged Commodities) Rules, 2011, as amended by the Legal Metrology (Packaged Commodities) Amendment Rules, 2021 (G.S.R. 779(E)) and 2022. Declarations evaluated include Rule 6(1)(a) Manufacturer/Packer/Importer identity, Rule 6(1)(b) Complete Address, Rule 6(1)(c) Standard Net Quantity, Rule 6(1)(d) Month & Year of Manufacture/Packing, Rule 6(1)(e) Maximum Retail Price (inclusive of all taxes) and Unit Sale Price, and Rule 6(1)(g) Consumer Care details (Name, Address, Telephone, and Email).
          </p>
        </div>
      </main>
    </div>
  );
};

export default AuthorityDashboard;
