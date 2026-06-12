'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { CATEGORIES } from '@/types/database';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Pencil, ArrowRight, ArrowLeft } from 'lucide-react';

export default function EditIdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchIdea();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const fetchIdea = async () => {
    const { data } = await supabase
      .from('ideas')
      .select('*')
      .eq('id', id)
      .single();

    if (!data) {
      toast.error('Idea not found');
      router.push('/dashboard');
      return;
    }

    if (user && data.user_id !== user.id) {
      toast.error('You can only edit your own ideas');
      router.push(`/ideas/${id}`);
      return;
    }

    setTitle(data.title);
    setProblem(data.problem);
    setSolution(data.solution);
    setTargetAudience(data.target_audience || '');
    setCategory(data.category);
    setDescription(data.description || '');
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !problem.trim() || !solution.trim() || !category) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('ideas')
      .update({
        title: title.trim(),
        problem: problem.trim(),
        solution: solution.trim(),
        target_audience: targetAudience.trim() || null,
        category,
        description: description.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update idea');
      setSaving(false);
    } else {
      toast.success('Idea updated!');
      router.push(`/ideas/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  const inputClasses =
    'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400';
  const labelClasses = 'block text-sm font-medium text-gray-700 mb-1.5';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fadeIn">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl mb-4">
          <Pencil className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Edit Idea</h1>
        <p className="text-gray-500 mt-2">Update your startup concept</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
        <div>
          <label htmlFor="title" className={labelClasses}>
            Idea Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClasses}
            required
            maxLength={100}
          />
        </div>

        <div>
          <label htmlFor="problem" className={labelClasses}>
            Problem <span className="text-red-500">*</span>
          </label>
          <textarea
            id="problem"
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            className={`${inputClasses} resize-none`}
            rows={3}
            required
          />
        </div>

        <div>
          <label htmlFor="solution" className={labelClasses}>
            Solution <span className="text-red-500">*</span>
          </label>
          <textarea
            id="solution"
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            className={`${inputClasses} resize-none`}
            rows={3}
            required
          />
        </div>

        <div>
          <label htmlFor="audience" className={labelClasses}>
            Target Audience
          </label>
          <input
            id="audience"
            type="text"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="category" className={labelClasses}>
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`${inputClasses} cursor-pointer`}
            required
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="description" className={labelClasses}>
            Additional Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputClasses} resize-none`}
            rows={4}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-semibold text-lg hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Save Changes
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
