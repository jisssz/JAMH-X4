import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck,
  Download,
  RefreshCw,
  Info,
  AlertTriangle,
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
import ZenoxNav from '../components/ui/ZenoxNav';
import SectionLabel from '../components/ui/SectionLabel';

export const AuthorityDashboard: React.FC = () => {
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
    <div className="relative min-h-screen bg-[#06080e] text-slate-100 font-sans selection:bg-emerald-500 selection:text-white pb-24">
      <ZenoxNav />

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-6 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <SectionLabel>Public Surveillance Report</SectionLabel>
              <span className="text-[10px] font-mono text-slate-500 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                LM PCR 2011
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-white font-normal tracking-tight">
              Market surveillance <span className="font-serif italic text-slate-400">intelligence.</span>
            </h1>
            <p className="text-xs text-slate-400 mt-2 max-w-xl font-sans leading-relaxed">
              Aggregated screening observations on packaging compliance, Rule 6 mandatory declaration omissions, and sector-wide packaging practices.
            </p>
          </div>

          {/* Top Controls */}
          <div className="flex items-center gap-2.5">
            {/* Mode Toggle */}
            <div className="flex items-center bg-[#090d16] border border-white/[0.08] rounded-full p-1 text-xs">
              <button
                onClick={() => setUseDemoData(false)}
                className={`px-3 py-1.5 rounded-full transition cursor-pointer text-xs font-medium ${
                  !useDemoData
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Live Registry
              </button>
              <button
                onClick={() => setUseDemoData(true)}
                className={`px-3 py-1.5 rounded-full transition cursor-pointer text-xs font-medium ${
                  useDemoData
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Pilot Benchmark (1,420)
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={() => fetchAllAnalytics(useDemoData)}
              disabled={loading}
              className="p-2 rounded-full bg-[#090d16] border border-white/[0.08] hover:border-white/20 text-slate-400 hover:text-white transition cursor-pointer disabled:opacity-50"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              disabled={loading || !summary}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-slate-200 transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Zero PII & Scope Notice */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 p-4 rounded-xl bg-[#090d16] border border-white/[0.08] flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-medium text-slate-200 block">Privacy Architecture: Zero PII Guarantee</span>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Surveillance data comprises only anonymous statutory packaging attributes (Rule 6 declarations, detected values, and defect citations). No names, phone numbers, GPS coordinates, or packaging photos are stored or transmitted.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#090d16] border border-white/[0.08] flex items-start gap-3">
            <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-medium text-slate-200 block">Dataset Scope</span>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                {isDemo
                  ? 'Illustrative demonstration dataset (1,420 pilot multi-district screenings across 5 commodity sectors).'
                  : 'Live production registry synchronized directly from verified edge consumer screenings.'}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/20 text-amber-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 4 Core Headline Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#090d16] border border-white/[0.08]">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
              Total Screenings
            </span>
            <div className="font-display text-3xl sm:text-4xl text-white font-normal mt-2">
              {loading ? '...' : summary?.totalScans.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-sans">
              Commodities evaluated
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#090d16] border border-white/[0.08]">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
              Compliance Rate
            </span>
            <div className="font-display text-3xl sm:text-4xl text-emerald-400 font-normal mt-2">
              {loading ? '...' : `${summary?.passRate}%`}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-sans">
              {loading ? '...' : `${summary?.passCount.toLocaleString()} declared compliant`}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#090d16] border border-white/[0.08]">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
              Advisory Reviews
            </span>
            <div className="font-display text-3xl sm:text-4xl text-amber-400 font-normal mt-2">
              {loading ? '...' : summary?.reviewCount.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-sans">
              Flagged for statutory review
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#090d16] border border-white/[0.08]">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
              Statutory Issues
            </span>
            <div className="font-display text-3xl sm:text-4xl text-slate-200 font-normal mt-2">
              {loading ? '...' : summary?.totalIssues.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-sans">
              Rule 6 omissions identified
            </p>
          </div>
        </div>

        {/* Section 2: Defect Breakdown & Commodity Sectors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Statutory Defect Frequency */}
          <div className="p-6 rounded-2xl bg-[#090d16] border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-white">Statutory Defect Distribution</h2>
                <p className="text-xs text-slate-400 mt-0.5">Most common declaration omissions under Rule 6</p>
              </div>
              <span className="text-[10px] font-mono text-slate-500">PCR 2011</span>
            </div>

            <div className="space-y-3 pt-2">
              {issues?.items.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">{item.field}</span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-slate-300 transition-all duration-500"
                      style={{ width: `${Math.min(item.percentage * 2.5, 100)}%` }}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    Ref: {item.ruleReference}
                  </div>
                </div>
              ))}
              {(!issues || issues.items.length === 0) && !loading && (
                <div className="text-center py-6 text-xs text-slate-500">
                  No statutory defects recorded.
                </div>
              )}
            </div>
          </div>

          {/* Commodity Sector Distribution */}
          <div className="p-6 rounded-2xl bg-[#090d16] border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-white">Commodity Sector Volume</h2>
                <p className="text-xs text-slate-400 mt-0.5">Screening counts and review rates by product class</p>
              </div>
              <span className="text-[10px] font-mono text-slate-500">SECTORS</span>
            </div>

            <div className="divide-y divide-white/[0.06] pt-1">
              {categories?.items.map((cat, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-white">{cat.category}</div>
                    <div className="text-[11px] text-slate-500">
                      {cat.screenings.toLocaleString()} screenings &bull; {cat.reviewCount} reviews
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-mono font-medium ${
                        cat.reviewRate > 25 ? 'text-amber-400' : 'text-slate-300'
                      }`}
                    >
                      {cat.reviewRate}%
                    </span>
                    <span className="text-[10px] text-slate-500 block">review rate</span>
                  </div>
                </div>
              ))}
              {(!categories || categories.items.length === 0) && !loading && (
                <div className="text-center py-6 text-xs text-slate-500">
                  No sector records available.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Monthly Trends */}
        <div className="p-6 rounded-2xl bg-[#090d16] border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-white">Monthly Surveillance Trajectory</h2>
              <p className="text-xs text-slate-400 mt-0.5">Surveillance volume and review rates over observation periods</p>
            </div>
            <span className="text-[10px] font-mono text-slate-500">CHRONOLOGICAL</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
            {trends?.items.map((t, idx) => {
              const reviewPct = t.scans > 0 ? Math.round((t.reviews / t.scans) * 100) : 0;
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-black/30 border border-white/[0.04] text-center"
                >
                  <div className="text-[10px] font-mono text-slate-500 uppercase">{t.period}</div>
                  <div className="font-display text-xl text-white font-normal mt-1">{t.scans}</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-1">
                    {t.reviews} rev ({reviewPct}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 4: Brand & Manufacturer Surveillance Table */}
        <div className="p-6 rounded-2xl bg-[#090d16] border border-white/[0.08] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium text-white">Manufacturer Surveillance Observations</h2>
              <p className="text-xs text-slate-400 mt-0.5">Screening observations recorded across declared packers and manufacturers</p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Info className="w-3.5 h-3.5" />
              <span>Advisory screening metrics only</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-500 font-mono uppercase text-[10px]">
                  <th className="py-2.5 px-3 font-normal">Manufacturer / Declared Brand</th>
                  <th className="py-2.5 px-3 text-right font-normal">Screenings</th>
                  <th className="py-2.5 px-3 text-right font-normal">Reviews Flagged</th>
                  <th className="py-2.5 px-3 text-right font-normal">Review Rate</th>
                  <th className="py-2.5 px-3 text-right font-normal">Advisory Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {brands?.items.map((b, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-3 font-medium text-slate-200">
                      {b.manufacturer}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400">
                      {b.screenings.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400">
                      {b.reviewCount}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-slate-200">
                      {b.reviewRate}%
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono ${
                          b.reviewRate <= 20
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : b.reviewRate <= 35
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-white/[0.06] text-slate-300 border border-white/[0.08]'
                        }`}
                      >
                        {b.reviewRate <= 20
                          ? 'Standard'
                          : b.reviewRate <= 35
                          ? 'Moderate'
                          : 'Elevated'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-slate-500 font-sans italic pt-2">
            Surveillance metrics represent automated crowdsourced consumer screenings. Screening outcomes do not establish legal non-compliance or judicial liability.
          </p>
        </div>

        {/* Statutory Regulatory Benchmark Footer */}
        <div className="p-5 rounded-2xl bg-[#090d16] border border-white/[0.08] text-xs space-y-1.5 text-slate-400">
          <div className="font-medium text-slate-300 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Statutory Benchmark: Legal Metrology Act, 2009 & PCR 2011</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            Automated screening derives strictly from Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011, as amended (G.S.R. 779(E)). Declarations verified include Rule 6(1)(a) Manufacturer/Packer/Importer, Rule 6(1)(b) Address, Rule 6(1)(c) Standard Net Quantity, Rule 6(1)(d) Month & Year of Manufacture/Packing, Rule 6(1)(e) Maximum Retail Price (inclusive of taxes) & Unit Sale Price, and Rule 6(1)(g) Consumer Care details.
          </p>
        </div>
      </main>
    </div>
  );
};

export default AuthorityDashboard;
