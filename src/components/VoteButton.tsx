'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { ThumbsUp, ThumbsDown, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface VoteButtonProps {
  ideaId: string;
  initialBuildVotes: number;
  initialSkipVotes: number;
  initialVoteType: 'build' | 'skip' | null;
  size?: 'sm' | 'md';
}

const SKIP_REASONS = [
  { id: 'market_small', label: '🛒 Market too small' },
  { id: 'already_exists', label: '🔄 Similar product already exists' },
  { id: 'too_hard', label: '🛠️ Too technically complex to build' },
  { id: 'no_monetization', label: '💸 Hard to monetize' },
  { id: 'other', label: '❓ Other / Unclear value' },
];

export default function VoteButton({
  ideaId,
  initialBuildVotes,
  initialSkipVotes,
  initialVoteType,
  size = 'md',
}: VoteButtonProps) {
  const [buildVotes, setBuildVotes] = useState(initialBuildVotes);
  const [skipVotes, setSkipVotes] = useState(initialSkipVotes);
  const [votedType, setVotedType] = useState<'build' | 'skip' | null>(initialVoteType);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('market_small');

  // Sync props to state when parent loads them asynchronously (e.g. user session resolves)
  useEffect(() => {
    setBuildVotes(initialBuildVotes);
    setSkipVotes(initialSkipVotes);
    setVotedType(initialVoteType);
  }, [initialBuildVotes, initialSkipVotes, initialVoteType]);
  
  const { user } = useAuth();
  const supabase = createClient();
  const router = useRouter();

  const handleBuildVote = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Please sign in to vote');
      router.push('/auth/login');
      return;
    }

    setLoading(true);

    if (votedType === 'build') {
      // Remove Build Vote
      const { error } = await supabase
        .from('votes')
        .delete()
        .eq('user_id', user.id)
        .eq('idea_id', ideaId);

      if (error) {
        toast.error(error.message);
      } else {
        setBuildVotes((v) => Math.max(0, v - 1));
        setVotedType(null);
        toast.success('Vote removed');
      }
    } else if (votedType === 'skip') {
      // Switch from Skip to Build
      const { error } = await supabase
        .from('votes')
        .update({ vote_type: 'build', skip_reason: null })
        .eq('user_id', user.id)
        .eq('idea_id', ideaId);

      if (error) {
        toast.error(error.message);
      } else {
        setSkipVotes((v) => Math.max(0, v - 1));
        setBuildVotes((v) => v + 1);
        setVotedType('build');
        toast.success('Switched to Build!');
      }
    } else {
      // New Build Vote
      const { error } = await supabase
        .from('votes')
        .insert({ user_id: user.id, idea_id: ideaId, vote_type: 'build' });

      if (error) {
        toast.error(error.message);
      } else {
        setBuildVotes((v) => v + 1);
        setVotedType('build');
        toast.success('Voted Build! 👍');
      }
    }

    setLoading(false);
  };

  const handleSkipVoteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Please sign in to vote');
      router.push('/auth/login');
      return;
    }

    if (votedType === 'skip') {
      // If already voted skip, just delete it immediately without modal
      removeSkipVote();
    } else {
      // Open modal to select reason
      setIsModalOpen(true);
    }
  };

  const removeSkipVote = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('votes')
      .delete()
      .eq('user_id', user!.id)
      .eq('idea_id', ideaId);

    if (error) {
      toast.error(error.message);
    } else {
      setSkipVotes((v) => Math.max(0, v - 1));
      setVotedType(null);
      toast.success('Vote removed');
    }
    setLoading(false);
  };

  const submitSkipVote = async () => {
    setLoading(true);
    setIsModalOpen(false);

    if (votedType === 'build') {
      // Switch from Build to Skip
      const { error } = await supabase
        .from('votes')
        .update({ vote_type: 'skip', skip_reason: selectedReason })
        .eq('user_id', user!.id)
        .eq('idea_id', ideaId);

      if (error) {
        toast.error(error.message);
      } else {
        setBuildVotes((v) => Math.max(0, v - 1));
        setSkipVotes((v) => v + 1);
        setVotedType('skip');
        toast.success('Switched to Skip! 👎');
      }
    } else {
      // New Skip Vote
      const { error } = await supabase
        .from('votes')
        .insert({
          user_id: user!.id,
          idea_id: ideaId,
          vote_type: 'skip',
          skip_reason: selectedReason,
        });

      if (error) {
        toast.error(error.message);
      } else {
        setSkipVotes((v) => v + 1);
        setVotedType('skip');
        toast.success('Voted Skip! 👎');
      }
    }
    setLoading(false);
  };

  // Calculations for ratio bar
  const totalVotes = buildVotes + skipVotes;
  const buildPercentage = totalVotes > 0 ? Math.round((buildVotes / totalVotes) * 100) : 50;
  const skipPercentage = totalVotes > 0 ? Math.round((skipVotes / totalVotes) * 100) : 50;

  const sizeClasses = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className="flex flex-col gap-2 w-full max-w-[280px]">
      <div className="flex items-center gap-2">
        {/* Build Button */}
        <button
          onClick={handleBuildVote}
          disabled={loading}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl font-bold border-2 transition-all ${sizeClasses} ${
            votedType === 'build'
              ? 'bg-violet-50 border-violet-500 text-violet-700 shadow-sm shadow-violet-500/10'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
          } disabled:opacity-50`}
        >
          <ThumbsUp className={`${iconSize} ${votedType === 'build' ? 'fill-violet-200 text-violet-600' : 'text-gray-400'}`} />
          <span>Build</span>
          <span className={`ml-0.5 text-xs font-semibold ${votedType === 'build' ? 'text-violet-700' : 'text-gray-400'}`}>
            ({buildVotes})
          </span>
        </button>

        {/* Skip Button */}
        <button
          onClick={handleSkipVoteClick}
          disabled={loading}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl font-bold border-2 transition-all ${sizeClasses} ${
            votedType === 'skip'
              ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-sm shadow-rose-500/10'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
          } disabled:opacity-50`}
        >
          <ThumbsDown className={`${iconSize} ${votedType === 'skip' ? 'fill-rose-200 text-rose-500' : 'text-gray-400'}`} />
          <span>Skip</span>
          <span className={`ml-0.5 text-xs font-semibold ${votedType === 'skip' ? 'text-rose-700' : 'text-gray-400'}`}>
            ({skipVotes})
          </span>
        </button>
      </div>

      {/* Progress / Ratio Bar */}
      {totalVotes > 0 ? (
        <div className="space-y-1">
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${buildPercentage}%` }}
              className="h-full bg-violet-600 transition-all duration-300"
            />
            <div
              style={{ width: `${skipPercentage}%` }}
              className="h-full bg-rose-400 transition-all duration-300"
            />
          </div>
          <div className="flex justify-between text-[10px] font-bold text-gray-400">
            <span>{buildPercentage}% Build</span>
            <span>{skipPercentage}% Skip</span>
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-gray-400 text-center italic">No votes yet</p>
      )}

      {/* Skip Reason Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-gray-100 shadow-2xl p-6 relative overflow-hidden animate-slideUp">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-gray-900 pr-8">Why skip this idea?</h3>
            <p className="text-sm text-gray-500 mt-1 mb-5">
              Select your primary reason to help the founder iterate.
            </p>

            <div className="space-y-2">
              {SKIP_REASONS.map((reason) => (
                <label
                  key={reason.id}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedReason === reason.id
                      ? 'border-violet-500 bg-violet-50/50 text-violet-900 font-medium'
                      : 'border-gray-100 hover:border-gray-200 text-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="skip_reason"
                    value={reason.id}
                    checked={selectedReason === reason.id}
                    onChange={() => setSelectedReason(reason.id)}
                    className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300"
                  />
                  <span className="text-sm">{reason.label}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitSkipVote}
                className="flex-1 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-sm font-semibold text-white transition-colors shadow-md shadow-violet-600/10"
              >
                Confirm Vote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
