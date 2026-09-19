import React from 'react';
import { useNavigate } from 'react-router-dom';
import ZenoxNav from '../components/ui/ZenoxNav';
import GlowBackground from '../components/ui/GlowBackground';
import SectionLabel from '../components/ui/SectionLabel';

export const Rules: React.FC = () => {
  const navigate = useNavigate();

  const rulesData = [
    {
      num: '01',
      title: 'Manufacturer, Packer or Importer',
      rule: 'Rule 6(1)(a) & 6(1)(ab)',
      citation: 'G.S.R. 427(E)',
      summary:
        'Every package must declare the name and complete address of the manufacturer, or where the manufacturer is not the packer, the name and address of the manufacturer and packer. For imported goods, the name and complete address of the importer must be declared.',
      criteria: [
        'Corporate entity name clearly identifiable',
        'Registered premise address including city, state, or postal PIN code',
        'Distinct qualification for domestic vs. imported goods',
      ],
    },
    {
      num: '02',
      title: 'Standard Net Quantity',
      rule: 'Rule 6(1)(c)',
      citation: 'Second Schedule Units',
      summary:
        'The net quantity, in terms of standard unit of weight or measure of the commodity contained in the package, must be declared using SI units (g, kg, ml, l, m) or by number where goods are sold by count.',
      criteria: [
        'Standard metric units only (non-metric like lbs/oz prohibited)',
        'Proper spacing between numerical value and unit symbol (e.g., 500 g, not 500g)',
        'Minimum font size compliant with package area schedule',
      ],
    },
    {
      num: '03',
      title: 'Month & Year of Manufacture or Packing',
      rule: 'Rule 6(1)(d)',
      citation: 'G.S.R. 779(E)',
      summary:
        'The month and year in which the commodity is manufactured, packed, or imported must be clearly indicated. Post-dated packaging dates relative to the date of inspection are strictly prohibited.',
      criteria: [
        'Explicit statutory prefix: MFD, MFG, or PKD',
        'Standard date format (MM/YYYY or DD/MM/YYYY)',
        'Prohibition of future post-dating beyond the current calendar month',
      ],
    },
    {
      num: '04',
      title: 'Maximum Retail Price & Unit Sale Price',
      rule: 'Rule 6(1)(da) & 6(1)(e)',
      citation: 'G.S.R. 629(E)',
      summary:
        'The maximum retail price at which the commodity in packaged form may be sold to the ultimate consumer, inclusive of all taxes. For pre-packaged commodities, the unit sale price (e.g. ₹ per g / ml) must also be stated where mandatory.',
      criteria: [
        'Mandatory phrasing: "Inclusive of all taxes" or "Incl. of all taxes"',
        'Recognized currency symbol (₹ or Rs.)',
        'Clear, legible printing not obscured by folds or crimps',
      ],
    },
    {
      num: '05',
      title: 'Consumer Care Cell Details',
      rule: 'Rule 6(1)(n)',
      citation: 'G.S.R. 2022 Amendment',
      summary:
        'Every package must declare the name, address, telephone number, and email address of the person or office that can be contacted in case of consumer complaints or queries.',
      criteria: [
        'Active toll-free number or customer care telephone line',
        'Designated consumer grievance email address',
        'Postal contact address of the grievance officer',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#06080e] text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      <GlowBackground variant="subtle" />
      <ZenoxNav />

      <main className="relative z-10 w-full max-w-4xl mx-auto px-5 sm:px-8 py-12 sm:py-20 space-y-16">
        {/* Editorial Header */}
        <div className="space-y-4 pt-4">
          <SectionLabel>Legal Metrology Gazette Reference</SectionLabel>
          <h1 className="hero-display text-white tracking-tight">
            Statutory <br />
            <span className="font-display-italic text-slate-300">declarations.</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed font-sans font-normal">
            The Legal Metrology (Packaged Commodities) Rules, 2011 mandate explicit packaging disclosures on all pre-packaged commodities sold in India. The LMCC engine programmatically audits packages against the five core statutory declarations below.
          </p>
        </div>

        {/* Gazette Criteria List */}
        <div className="space-y-12 divide-y divide-white/[0.08]">
          {rulesData.map((rule) => (
            <div key={rule.num} className="pt-12 first:pt-0 space-y-6">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-mono text-emerald-400 block">{rule.num}</span>
                <span className="text-xs font-mono text-slate-500">{rule.citation}</span>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-display text-white font-normal tracking-tight">
                  {rule.title}
                </h2>
                <span className="text-xs font-mono text-emerald-400 mt-1 block">
                  {rule.rule}
                </span>
              </div>

              <p className="text-sm text-slate-300 font-sans leading-relaxed">
                {rule.summary}
              </p>

              <div className="bg-[#090d16] rounded-2xl p-5 border border-white/[0.06] space-y-3">
                <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-slate-400 block">
                  Screening Verification Checklist
                </span>
                <ul className="space-y-2 text-xs font-sans text-slate-400">
                  {rule.criteria.map((c, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Call to Action */}
        <div className="rounded-3xl bg-[#090d16] border border-white/[0.08] p-10 sm:p-14 text-center shadow-xl space-y-5">
          <h2 className="section-display text-white tracking-tight">
            Ready to test a product against <span className="font-display-italic text-slate-300">these rules?</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto font-sans leading-relaxed">
            Upload or photograph package panels to screen compliance against all Rule 6 statutory requirements.
          </p>
          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="px-7 py-3 rounded-full font-medium text-xs bg-white text-slate-950 hover:bg-slate-100 transition-all duration-200 active:scale-95 cursor-pointer font-sans"
          >
            Launch scanner →
          </button>
        </div>
      </main>

      <footer className="relative z-10 w-full border-t border-white/[0.08] bg-[#06080e] py-8 text-xs text-slate-500 font-sans">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 flex items-center justify-between">
          <span>LMCC · Legal Metrology Rules, 2011</span>
          <span>SIH 2026 · Team JAMH X4</span>
        </div>
      </footer>
    </div>
  );
};

export default Rules;
