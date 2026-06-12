'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Poll, PollOption } from '@/types/database';
import toast from 'react-hot-toast';
import { BarChart3, CheckCircle2, Lock, Vote } from 'lucide-react';

interface PollSectionProps {
  ideaId: string;
  isOwner: boolean;
}

export default function PollSection({ ideaId, isOwner }: PollSectionProps) {
  const { user } = useAuth();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchPoll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideaId, user]);

  const fetchPoll = async () => {
    setLoading(true);
    try {
      const { data: pollData, error } = await supabase
        .from('polls')
        .select(`
          id,
          idea_id,
          question,
          created_at,
          options:poll_options(id, poll_id, option_text, votes_count)
        `)
        .eq('idea_id', ideaId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching poll:', error);
      } else if (pollData) {
        setPoll(pollData as unknown as Poll);

        // Check user vote if logged in
        if (user) {
          const { data: voteData } = await supabase
            .from('poll_votes')
            .select('poll_option_id')
            .eq('poll_id', pollData.id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (voteData) {
            setVotedOptionId(voteData.poll_option_id);
          }
        }
      }
    } catch (err) {
      console.error('Exception fetching poll:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (optionId: string) => {
    if (!user) {
      toast.error('Please sign in to vote in polls');
      return;
    }
    if (!poll) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('poll_votes').insert({
        poll_id: poll.id,
        poll_option_id: optionId,
        user_id: user.id,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already voted on this poll');
        } else {
          toast.error('Failed to register your vote');
        }
      } else {
        toast.success('Vote cast successfully!');
        setVotedOptionId(optionId);
        // Refresh poll counts
        await fetchPoll();
      }
    } catch (err) {
      console.error('Exception voting:', err);
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
        <div className="h-5 bg-gray-100 rounded w-1/3 mb-4" />
        <div className="h-10 bg-gray-50 rounded mb-2" />
        <div className="h-10 bg-gray-50 rounded" />
      </div>
    );
  }

  if (!poll) return null;

  const totalVotes = poll.options?.reduce((sum, opt) => sum + opt.votes_count, 0) || 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
          <BarChart3 className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-gray-900 text-lg">Community Validation Poll</h3>
      </div>

      <p className="text-gray-800 font-semibold mb-5 text-base">{poll.question}</p>

      <div className="space-y-3">
        {poll.options?.map((option) => {
          const votes = option.votes_count || 0;
          const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isSelected = votedOptionId === option.id;
          const showResults = !!votedOptionId || isOwner || !user;

          if (showResults) {
            return (
              <div key={option.id} className="relative overflow-hidden rounded-xl border border-gray-150 p-4 transition-all">
                {/* Background bar fill */}
                <div
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${
                    isSelected ? 'from-violet-50 to-indigo-50/70 border-r-2 border-violet-500' : 'from-gray-50 to-gray-100/30'
                  } transition-all duration-700 ease-out`}
                  style={{ width: `${percentage}%` }}
                />
                
                {/* Content */}
                <div className="relative flex justify-between items-center z-10">
                  <div className="flex items-center gap-2 min-w-0">
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-violet-600 flex-shrink-0" />}
                    <span className={`text-sm ${isSelected ? 'font-semibold text-violet-900' : 'text-gray-700'} truncate`}>
                      {option.option_text}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 ml-2">
                    {percentage}% <span className="text-xs font-normal text-gray-400">({votes})</span>
                  </span>
                </div>
              </div>
            );
          }

          // Voting Mode
          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={submitting}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-violet-300 hover:bg-violet-50/30 text-left transition-all group disabled:opacity-50"
            >
              <span className="text-sm font-medium text-gray-750 group-hover:text-violet-900 transition-colors">
                {option.option_text}
              </span>
              <div className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center group-hover:border-violet-500 transition-colors flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-violet-600 scale-0 group-hover:scale-100 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between items-center mt-5 text-xs text-gray-400">
        <span>Total responses: {totalVotes}</span>
        {!user && (
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3" /> Sign in to cast your vote
          </span>
        )}
        {user && votedOptionId && (
          <span className="text-violet-600 font-medium">Thank you for voting!</span>
        )}
      </div>
    </div>
  );
}
