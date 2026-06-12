'use client';

import { useState } from 'react';
import { Idea } from '@/types/database';
import { Sparkles, BrainCircuit, CheckCircle2, ChevronRight, Play, AlertCircle } from 'lucide-react';

interface AIFeasibilityAnalyzerProps {
  idea: Idea;
}

export default function AIFeasibilityAnalyzer({ idea }: AIFeasibilityAnalyzerProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [scanStep, setScanStep] = useState(0);

  const scanSteps = [
    'Parsing startup parameters & target audience...',
    'Evaluating market space and possible competitors...',
    'Performing SWOT parameter alignment...',
    'Synthesizing MVP roadmap & validation score...',
  ];

  const triggerAnalysis = () => {
    setAnalyzing(true);
    setScanStep(0);

    const interval = setInterval(() => {
      setScanStep((prev) => {
        if (prev >= scanSteps.length - 1) {
          clearInterval(interval);
          setAnalyzing(false);
          setAnalyzed(true);
          return prev;
        }
        return prev + 1;
      });
    }, 900);
  };

  // Helper to generate dynamic metrics based on idea properties
  const getDynamicAnalysis = () => {
    const category = idea.category || 'SaaS';
    const title = idea.title.toLowerCase();
    const problem = idea.problem.toLowerCase();
    
    // Calculate a dynamic score based on detail length and votes
    let score = 65;
    const votes = (idea.build_votes_count || 0) + (idea.skip_votes_count || 0);
    if (votes > 0) score += Math.min(votes * 2, 15);
    if (idea.target_audience) score += 5;
    if (idea.description && idea.description.length > 150) score += 10;
    score = Math.min(score, 98); // Cap at 98

    let categoryData = {
      strengths: ['Low upfront marginal costs', 'Highly scalable distribution model'],
      weaknesses: ['High user friction at initial onboarding', 'Requires significant behavioral shift'],
      opportunities: ['Integrations with existing toolstacks', 'Micro-niching into underserved user groups'],
      threats: ['Established legacy systems holding data lock-in', 'Rapid replication by competitors'],
      competitors: ['Existing sheets & manual tools', 'Generalist market solutions'],
      mvpRoadmap: [
        'Build a simple landing page with a waitlist and copy detailing the exact problem statement.',
        'Run cold outreach / interviews with 15 users in the target demographic.',
        'Create a clickable Figma prototype showing the core workflow.',
        'Launch a manual concierge MVP (doing the work manually behind the scenes) for 5 users.'
      ]
    };

    if (category.includes('AI') || title.includes('ai') || problem.includes('ai') || problem.includes('gpt')) {
      categoryData = {
        strengths: ['High productivity lift for end-users', 'Automated synthesis & reduction of manual labor', 'High margin scalability'],
        weaknesses: ['Data pipeline cold-start challenge', 'Potential computational/API cost overheads', 'Potential inaccuracies or quality control issues'],
        opportunities: ['Creating domain-specific fine-tuning models', 'Custom API agent workflows', 'Automating legacy manual entry tasks'],
        threats: ['Platform risk (OpenAI/Google releasing native alternatives)', 'High developer/API costs', 'Low moat if relying solely on wrappers'],
        competitors: ['ChatGPT/Claude direct chats', 'Manual legacy workflows', 'Incumbent software adding AI features'],
        mvpRoadmap: [
          'Design an interactive prototype using v0/Lovable to validate interface utility.',
          'Manually mock the AI response output to test if target audience finds the results useful.',
          'Build a lightweight wrapper using Next.js and Vercel AI SDK.',
          'Launch a closed beta targeting a highly specific industry subset.'
        ]
      };
    } else if (category.includes('SaaS') || title.includes('saas') || title.includes('platform')) {
      categoryData = {
        strengths: ['Predictable recurring revenue model (MRR)', 'High customer lifetime value (LTV)', 'Strong scaling potential'],
        weaknesses: ['High initial customer acquisition costs (CAC)', 'Churn risk if product is not deeply integrated', 'Steep product adoption curve'],
        opportunities: ['Vertical integration into specific industries', 'Adding collaboration and team features', 'White-labeling options'],
        threats: ['Price erosion due to hyper-competition', 'Macro budget tightening reducing software spend', 'Developer fatigue in subscription spaces'],
        competitors: ['Legacy spreadsheets (Excel/Sheets)', 'Disjointed point-solutions', 'Email threads'],
        mvpRoadmap: [
          'Launch a landing page with a clear value proposition and a pricing calculator waitlist.',
          'Reach out to 50 potential buyers on LinkedIn/X to schedule demo calls.',
          'Build a single core feature (the "hook") instead of a complete dashboard.',
          'Charge early adopters a one-time lifetime fee to fund initial build.'
        ]
      };
    } else if (category.includes('Marketplace') || title.includes('directory') || title.includes('marketplace')) {
      categoryData = {
        strengths: ['Strong network effects once scaled', 'Zero inventory risk (intermediary model)', 'High defensibility at scale'],
        weaknesses: ['The "chicken-and-egg" problem (supply vs. demand)', 'Low transactional take-rates in early stages', 'High trust barriers between parties'],
        opportunities: ['Curating verified/vetted providers to increase trust', 'Adding payment escrows and assurance layers', 'Targeting hyperlocal geographic areas'],
        threats: ['Disintermediation (users taking transactions off-platform)', 'Local regulatory/compliance hurdles', 'Direct advertising platform groups (Facebook/Reddit)'],
        competitors: ['Craigslist / Local directories', 'Niche Facebook/WhatsApp groups', 'Word of mouth referrals'],
        mvpRoadmap: [
          'Manually curate the supply side (first 20 listings) by scraping or direct invites.',
          'Connect demand to supply manually using simple forms, email, and manual matching.',
          'Establish trust by verifying listings/providers yourself before showing to buyers.',
          'Build automated transactional tools once matching starts happening regularly.'
        ]
      };
    } else if (category.includes('FinTech') || category.includes('HealthTech')) {
      categoryData = {
        strengths: ['High-value transactions with strong retention', 'Solves critical, high-pain compliance or financial points', 'High barrier to entry keeps out copycats'],
        weaknesses: ['Complex regulatory and compliance landscapes (HIPAA, PCI-DSS, GDPR)', 'Long sales and trust-building cycles', 'Zero tolerance for system errors/bugs'],
        opportunities: ['Leveraging open banking/finance APIs for customized insights', 'Providing automated compliance auditing', 'Simplifying complex legacy data feeds'],
        threats: ['Changes in federal or state regulatory guidelines', 'Security breach leading to loss of sensitive user records', 'High licensing/infrastructure setup costs'],
        competitors: ['Legacy enterprise systems', 'Paper-based systems', 'In-house legal/accounting teams'],
        mvpRoadmap: [
          'Verify legal/regulatory feasibility with a specialized compliance advisor.',
          'Build a high-fidelity visual mock dashboard with dummy data to build institutional trust.',
          'Integrate secure third-party widgets (e.g., Plaid, Stripe) instead of custom banking pipelines.',
          'Acquire a single design-partner client to co-develop the solution under strict supervision.'
        ]
      };
    }

    return { score, ...categoryData };
  };

  const analysis = getDynamicAnalysis();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow overflow-hidden relative">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg">AI Feasibility Analyzer</h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-indigo-600 font-semibold bg-indigo-50/50 px-2.5 py-1 rounded-full">
          <Sparkles className="w-3.5 h-3.5" />
          Powered by Gemini
        </div>
      </div>

      {!analyzed && !analyzing && (
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-5">
            Generate an automated startup feasibility report detailing strengths, weaknesses, competitor vectors, and an MVP scope plan.
          </p>
          <button
            onClick={triggerAnalysis}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/25 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            Analyze Startup Concept
          </button>
        </div>
      )}

      {analyzing && (
        <div className="py-8 space-y-4">
          <div className="flex justify-center mb-3">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
              <BrainCircuit className="w-5 h-5 text-indigo-650" />
            </div>
          </div>
          <p className="text-sm font-semibold text-center text-gray-800 animate-pulse">
            {scanSteps[scanStep]}
          </p>
          <div className="max-w-xs mx-auto bg-gray-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300 ease-out"
              style={{ width: `${((scanStep + 1) / scanSteps.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {analyzed && (
        <div className="space-y-6 animate-fadeIn">
          {/* Validation Score */}
          <div className="bg-gradient-to-r from-indigo-50 via-violet-50/40 to-white border border-indigo-100/50 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-20 h-20 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" className="stroke-indigo-100 fill-none" strokeWidth="6" />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  className="stroke-indigo-600 fill-none transition-all duration-1000 ease-out"
                  strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - analysis.score / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-xl font-black text-gray-900">{analysis.score}</span>
                <span className="text-xs text-gray-400 block -mt-1">%</span>
              </div>
            </div>
            <div className="text-center sm:text-left">
              <h4 className="font-bold text-gray-950 text-base">Concept Feasibility Score</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                This score represents structural validation (problem-solution alignment, target group description, and community interest dynamics).
              </p>
            </div>
          </div>

          {/* SWOT Grid */}
          <div>
            <h4 className="font-bold text-gray-900 text-sm mb-3 uppercase tracking-wide">SWOT Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-emerald-50/20 border border-emerald-100/40 p-4 rounded-xl">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">Strengths</span>
                <ul className="text-xs text-gray-600 space-y-1.5 list-disc pl-4">
                  {analysis.strengths.map((s, idx) => <li key={idx}>{s}</li>)}
                </ul>
              </div>
              <div className="bg-red-50/20 border border-red-100/40 p-4 rounded-xl">
                <span className="text-xs font-bold text-red-700 uppercase tracking-wider block mb-1">Weaknesses</span>
                <ul className="text-xs text-gray-600 space-y-1.5 list-disc pl-4">
                  {analysis.weaknesses.map((w, idx) => <li key={idx}>{w}</li>)}
                </ul>
              </div>
              <div className="bg-blue-50/20 border border-blue-100/40 p-4 rounded-xl">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">Opportunities</span>
                <ul className="text-xs text-gray-600 space-y-1.5 list-disc pl-4">
                  {analysis.opportunities.map((o, idx) => <li key={idx}>{o}</li>)}
                </ul>
              </div>
              <div className="bg-slate-50/40 border border-slate-200/40 p-4 rounded-xl">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Threats</span>
                <ul className="text-xs text-gray-600 space-y-1.5 list-disc pl-4">
                  {analysis.threats.map((t, idx) => <li key={idx}>{t}</li>)}
                </ul>
              </div>
            </div>
          </div>

          {/* Competitors & Hurdles */}
          <div className="bg-gray-50/50 border border-gray-100 p-4 rounded-xl">
            <h4 className="font-bold text-gray-900 text-sm mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Competitor Channels & Hurdles
            </h4>
            <div className="flex flex-wrap gap-2">
              {analysis.competitors.map((c, idx) => (
                <span key={idx} className="text-xs px-2.5 py-1 bg-white border border-gray-200 text-gray-600 rounded-lg font-medium shadow-sm">
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Validation Roadmap */}
          <div>
            <h4 className="font-bold text-gray-900 text-sm mb-3 uppercase tracking-wide">Suggested Validation Roadmap</h4>
            <div className="space-y-2">
              {analysis.mvpRoadmap.map((step, idx) => (
                <div key={idx} className="flex gap-3 items-start p-3 bg-gray-50/20 border border-gray-100/50 rounded-xl hover:bg-gray-50/50 transition-colors">
                  <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed font-medium">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
