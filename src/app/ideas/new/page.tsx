'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { CATEGORIES } from '@/types/database';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Lightbulb, ArrowRight } from 'lucide-react';

export default function SubmitIdeaPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');
  const [opt4, setOpt4] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please sign in to post an idea');
      router.push('/auth/login?redirect=/ideas/new');
      return;
    }

    if (!title.trim() || !problem.trim() || !solution.trim() || !category) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (showPoll && (!pollQuestion.trim() || !opt1.trim() || !opt2.trim())) {
      toast.error('Please fill in the poll question and at least two options');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('ideas')
      .insert({
        user_id: user.id,
        title: title.trim(),
        problem: problem.trim(),
        solution: solution.trim(),
        target_audience: targetAudience.trim() || null,
        category,
        description: description.trim() || null,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to post idea. Please try again.');
      setLoading(false);
    } else {
      if (showPoll && data) {
        const { data: pollData, error: pollError } = await supabase
          .from('polls')
          .insert({
            idea_id: data.id,
            question: pollQuestion.trim(),
          })
          .select()
          .single();

        if (pollData && !pollError) {
          const options = [opt1, opt2, opt3, opt4]
            .map((o) => o.trim())
            .filter((o) => o.length > 0)
            .map((o) => ({ poll_id: pollData.id, option_text: o }));

          await supabase.from('poll_options').insert(options);
        }
      }
      toast.success('Idea posted successfully!');
      router.push(`/ideas/${data.id}`);
    }
  };

  const inputClasses =
    'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400';
  const labelClasses = 'block text-sm font-medium text-gray-700 mb-1.5';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fadeIn">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl mb-4">
          <Lightbulb className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Post Your Idea</h1>
        <p className="text-gray-500 mt-2">Share your startup concept and get community feedback</p>
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
            placeholder="e.g., AI-Powered Resume Builder"
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
            placeholder="What problem are you solving?"
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
            placeholder="How does your idea solve this problem?"
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
            placeholder="e.g., Freelancers, Small businesses, Students"
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
            placeholder="Any additional details, business model, or unique features..."
            rows={4}
          />
        </div>

        {/* Community Poll Toggle */}
        <div className="border border-gray-100 rounded-2xl p-5 bg-gray-50/50">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showPoll}
              onChange={(e) => setShowPoll(e.target.checked)}
              className="w-5 h-5 text-violet-600 border-gray-300 rounded focus:ring-violet-500 cursor-pointer"
            />
            <div>
              <span className="font-semibold text-gray-900 block">Add a Community Poll</span>
              <span className="text-xs text-gray-500">Ask the community a validation question to collect data</span>
            </div>
          </label>

          {showPoll && (
            <div className="mt-5 space-y-4 border-t border-gray-100 pt-4 animate-fadeIn">
              <div>
                <label htmlFor="pollQuestion" className={labelClasses}>
                  Poll Question <span className="text-red-500">*</span>
                </label>
                <input
                  id="pollQuestion"
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className={inputClasses}
                  placeholder="e.g., Would you pay $5/month for this?"
                  required={showPoll}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="opt1" className={labelClasses}>
                    Option 1 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="opt1"
                    type="text"
                    value={opt1}
                    onChange={(e) => setOpt1(e.target.value)}
                    className={inputClasses}
                    placeholder="Yes, absolutely"
                    required={showPoll}
                  />
                </div>
                <div>
                  <label htmlFor="opt2" className={labelClasses}>
                    Option 2 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="opt2"
                    type="text"
                    value={opt2}
                    onChange={(e) => setOpt2(e.target.value)}
                    className={inputClasses}
                    placeholder="No, too expensive"
                    required={showPoll}
                  />
                </div>
                <div>
                  <label htmlFor="opt3" className={labelClasses}>
                    Option 3 (Optional)
                  </label>
                  <input
                    id="opt3"
                    type="text"
                    value={opt3}
                    onChange={(e) => setOpt3(e.target.value)}
                    className={inputClasses}
                    placeholder="Maybe, if it has X feature"
                  />
                </div>
                <div>
                  <label htmlFor="opt4" className={labelClasses}>
                    Option 4 (Optional)
                  </label>
                  <input
                    id="opt4"
                    type="text"
                    value={opt4}
                    onChange={(e) => setOpt4(e.target.value)}
                    className={inputClasses}
                    placeholder="Other"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-semibold text-lg hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Post Idea
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
