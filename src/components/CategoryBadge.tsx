const categoryColors: Record<string, string> = {
  SaaS: 'bg-blue-50 text-blue-700 border-blue-200',
  Marketplace: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'AI / ML': 'bg-purple-50 text-purple-700 border-purple-200',
  FinTech: 'bg-amber-50 text-amber-700 border-amber-200',
  HealthTech: 'bg-rose-50 text-rose-700 border-rose-200',
  EdTech: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'E-Commerce': 'bg-orange-50 text-orange-700 border-orange-200',
  Social: 'bg-pink-50 text-pink-700 border-pink-200',
  'Developer Tools': 'bg-slate-50 text-slate-700 border-slate-200',
  Sustainability: 'bg-green-50 text-green-700 border-green-200',
  Other: 'bg-gray-50 text-gray-700 border-gray-200',
};

export default function CategoryBadge({ category }: { category: string }) {
  const colors = categoryColors[category] || categoryColors.Other;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors}`}>
      {category}
    </span>
  );
}
