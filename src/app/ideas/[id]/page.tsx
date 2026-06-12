'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Idea, Comment } from '@/types/database';
import CategoryBadge from '@/components/CategoryBadge';
import VoteButton from '@/components/VoteButton';
import EmptyState from '@/components/EmptyState';
import PollSection from '@/components/PollSection';
import AIFeasibilityAnalyzer from '@/components/AIFeasibilityAnalyzer';
import Avatar from '@/components/Avatar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  User,
  Calendar,
  Target,
  MessageCircle,
  Send,
  Lightbulb,
  AlertTriangle,
  Trash2,
  ArrowLeft,
  Mail,
  Rocket,
  ArrowRight,
} from 'lucide-react';

export default function IdeaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [votedType, setVotedType] = useState<'build' | 'skip' | null>(null);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionType, setDecisionType] = useState<'building' | 'skipped' | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [decisionUrl, setDecisionUrl] = useState('');
  const [savingDecision, setSavingDecision] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchIdea();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const fetchIdea = async () => {
    setLoading(true);

    const { data: ideaData } = await supabase
      .from('ideas')
      .select('*, profiles(*)')
      .eq('id', id)
      .single();

    if (ideaData) {
      setIdea(ideaData);

      // Check if user voted
      if (user) {
        const { data: voteData } = await supabase
          .from('votes')
          .select('vote_type')
          .eq('user_id', user.id)
          .eq('idea_id', id)
          .maybeSingle();
        setVotedType(voteData ? voteData.vote_type as 'build' | 'skip' : null);
      }

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*, profiles(*)')
        .eq('idea_id', id)
        .order('created_at', { ascending: true });

      setComments(commentsData || []);
    }

    setLoading(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to comment');
      router.push('/auth/login');
      return;
    }
    if (!newComment.trim()) return;

    setCommentLoading(true);
    const { error } = await supabase.from('comments').insert({
      user_id: user.id,
      idea_id: id,
      content: newComment.trim(),
    });

    if (error) {
      toast.error('Failed to add comment');
    } else {
      toast.success('Comment added!');
      setNewComment('');
      await fetchIdea();
    }
    setCommentLoading(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      toast.error('Failed to delete comment');
    } else {
      toast.success('Comment deleted');
      setComments(comments.filter((c) => c.id !== commentId));
    }
  };

  const handleSaveDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionType) return;

    setSavingDecision(true);
    const { error } = await supabase
      .from('ideas')
      .update({
        status: decisionType,
        decision_notes: decisionNotes.trim() || null,
        decision_url: decisionType === 'building' ? decisionUrl.trim() || null : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to save your decision');
    } else {
      toast.success(`Idea marked as ${decisionType === 'building' ? 'BUILD' : 'SKIP'}!`);
      setShowDecisionModal(false);
      await fetchIdea();
    }
    setSavingDecision(false);
  };

  const handleMessageFounder = async () => {
    if (!user) {
      toast.error('Please sign in to send messages');
      router.push('/auth/login');
      return;
    }
    if (!idea) return;
    if (user.id === idea.user_id) {
      toast.error("This is your own idea");
      return;
    }

    // Check existing conversation
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .or(
        `and(participant_1.eq.${user.id},participant_2.eq.${idea.user_id}),and(participant_1.eq.${idea.user_id},participant_2.eq.${user.id})`
      )
      .maybeSingle();

    if (existing) {
      router.push(`/messages?conv=${existing.id}`);
      return;
    }

    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({ participant_1: user.id, participant_2: idea.user_id })
      .select()
      .single();

    if (error) {
      toast.error('Failed to start conversation');
    } else if (newConv) {
      router.push(`/messages?conv=${newConv.id}`);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EmptyState
          icon={AlertTriangle}
          title="Idea not found"
          description="This idea doesn't exist or has been removed."
          actionLabel="Explore Ideas"
          actionHref="/explore"
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fadeIn">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Decision Status Banner */}
      {idea.status && idea.status !== 'validating' && (
        <div className={`mb-6 p-6 rounded-2xl border ${
          idea.status === 'building'
            ? 'border-emerald-100 bg-emerald-50/30 text-emerald-800'
            : 'border-slate-200 bg-slate-50/50 text-slate-700'
        } animate-fadeIn`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${
              idea.status === 'building' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600'
            }`}>
              {idea.status === 'building' ? (
                <Rocket className="w-6 h-6 animate-pulse" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">
                  Founder Decision: {idea.status === 'building' ? 'Building MVP' : 'Skipped Idea'}
                </h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase ${
                  idea.status === 'building'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                } border`}>
                  {idea.status}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap font-medium text-gray-700">
                {idea.decision_notes || 'No decision notes shared.'}
              </p>
              {idea.status === 'building' && idea.decision_url && (
                <div className="mt-4">
                  <a
                    href={idea.decision_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 underline underline-offset-4"
                  >
                    View Project / Prototype
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <CategoryBadge category={idea.category} />
            <h1 className="text-3xl font-bold text-gray-900 mt-3">{idea.title}</h1>
          </div>
          <VoteButton
            ideaId={idea.id}
            initialBuildVotes={idea.build_votes_count || 0}
            initialSkipVotes={idea.skip_votes_count || 0}
            initialVoteType={votedType}
          />
        </div>

        {/* Founder info */}
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100">
          <Link href={`/profile/${idea.user_id}`} className="flex items-center gap-3 group">
            <Avatar url={idea.profiles?.avatar_url} name={idea.profiles?.username} size="lg" />
            <div>
              <p className="font-semibold text-gray-900 group-hover:text-violet-600 transition-colors">
                {idea.profiles?.full_name || idea.profiles?.username}
              </p>
              <p className="text-sm text-gray-500">@{idea.profiles?.username}</p>
            </div>
          </Link>
          <span className="text-gray-300 mx-2">·</span>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            {formatDate(idea.created_at)}
          </div>
        </div>

        {/* Content sections */}
        <div className="space-y-6">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Problem
            </h3>
            <p className="text-gray-600 leading-relaxed">{idea.problem}</p>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Solution
            </h3>
            <p className="text-gray-600 leading-relaxed">{idea.solution}</p>
          </div>

          {idea.target_audience && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
                <Target className="w-4 h-4 text-blue-500" />
                Target Audience
              </h3>
              <p className="text-gray-600 leading-relaxed">{idea.target_audience}</p>
            </div>
          )}

          {idea.description && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
                Description
              </h3>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{idea.description}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {user && user.id !== idea.user_id && (
          <div className="mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={handleMessageFounder}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-500/25"
            >
              <Mail className="w-4 h-4" />
              Message Founder
            </button>
          </div>
        )}
      </div>

      {/* Make Decision Panel (for founder only) */}
      {user && user.id === idea.user_id && idea.status === 'validating' && (
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50/50 border border-violet-100 rounded-2xl p-6 mb-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <Rocket className="w-5 h-5 text-violet-600" />
                Decide: Build or Skip?
              </h3>
              <p className="text-sm text-gray-650 mt-1">
                Have you gathered enough validation? Declare your official decision to the community.
              </p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={() => {
                  setDecisionType('building');
                  setShowDecisionModal(true);
                }}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-650 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Rocket className="w-4 h-4" />
                Build
              </button>
              <button
                onClick={() => {
                  setDecisionType('skipped');
                  setShowDecisionModal(true);
                }}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4" />
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Feasibility Analyzer */}
      <div className="mb-6">
        <AIFeasibilityAnalyzer idea={idea} />
      </div>

      {/* Community Poll */}
      <div className="mb-6">
        <PollSection ideaId={idea.id} isOwner={user?.id === idea.user_id} />
      </div>

      {/* Comments */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 mb-6">
          <MessageCircle className="w-5 h-5 text-violet-600" />
          Feedback ({comments.length})
        </h2>

        {/* Add comment form */}
        <form onSubmit={handleAddComment} className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={user ? 'Share your feedback on this idea...' : 'Sign in to leave feedback'}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400 resize-none"
            rows={3}
            disabled={!user}
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={commentLoading || !newComment.trim() || !user}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {commentLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Post Feedback
            </button>
          </div>
        </form>

        {/* Comments list */}
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No feedback yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-4 rounded-xl bg-gray-50/50">
                <Link href={`/profile/${comment.user_id}`}>
                  <Avatar url={comment.profiles?.avatar_url} name={comment.profiles?.username} size="md" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/profile/${comment.user_id}`}
                      className="text-sm font-semibold text-gray-900 hover:text-violet-600 transition-colors"
                    >
                      {comment.profiles?.full_name || comment.profiles?.username}
                    </Link>
                    <span className="text-xs text-gray-400">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm whitespace-pre-wrap">{comment.content}</p>
                </div>
                {user?.id === comment.user_id && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0 self-start"
                    title="Delete comment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decision Modal */}
      {showDecisionModal && decisionType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-gray-100 max-w-lg w-full p-6 shadow-2xl relative animate-scaleUp">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Mark Idea as {decisionType === 'building' ? 'BUILD' : 'SKIP'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {decisionType === 'building'
                ? 'Great! Tell the community what your build plan is, what prototype you are making, or share the repository link.'
                : 'Validation complete. Share what you learned and why you decided to skip this idea. Your lessons help other founders!'}
            </p>

            <form onSubmit={handleSaveDecision} className="space-y-4">
              {decisionType === 'building' && (
                <div>
                  <label htmlFor="decisionUrl" className="block text-sm font-medium text-gray-700 mb-1">
                    Project / Demo URL
                  </label>
                  <input
                    id="decisionUrl"
                    type="url"
                    value={decisionUrl}
                    onChange={(e) => setDecisionUrl(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-205 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900"
                    placeholder="https://github.com/... or https://my-mvp.com"
                  />
                </div>
              )}

              <div>
                <label htmlFor="decisionNotes" className="block text-sm font-medium text-gray-750 mb-1">
                  {decisionType === 'building' ? 'Build Plan & Notes' : 'Lessons Learned & Post-Mortem'}
                </label>
                <textarea
                  id="decisionNotes"
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-205 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900 resize-none"
                  rows={4}
                  placeholder={
                    decisionType === 'building'
                      ? 'e.g., We got 80% positive feedback! Starting MVP with basic feature set X...'
                      : 'e.g., Target audience indicated low willingness to pay. Competitor space is too crowded...'
                  }
                  required
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowDecisionModal(false)}
                  className="px-5 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-750 font-semibold text-sm rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDecision}
                  className={`px-5 py-2.5 text-white font-semibold text-sm rounded-xl transition-all flex items-center gap-1.5 shadow-lg ${
                    decisionType === 'building'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10'
                      : 'bg-slate-700 hover:bg-slate-800 shadow-slate-700/10'
                  }`}
                >
                  {savingDecision ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Confirm Decision'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
