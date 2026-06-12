'use client';

import Link from 'next/link';
import { Idea } from '@/types/database';
import CategoryBadge from './CategoryBadge';
import VoteButton from './VoteButton';
import Avatar from './Avatar';
import { MessageSquare, Rocket, AlertTriangle, ThumbsUp, ThumbsDown } from 'lucide-react';

interface IdeaCardProps {
  idea: Idea;
  votedType?: 'build' | 'skip' | null;
}

export default function IdeaCard({ idea, votedType = null }: IdeaCardProps) {
  const totalVotes = (idea.build_votes_count || 0) + (idea.skip_votes_count || 0);
  const buildPercentage = totalVotes > 0 ? Math.round((idea.build_votes_count / totalVotes) * 100) : null;

  return (
    <Link href={`/ideas/${idea.id}`} className="block group">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:shadow-gray-100/50 hover:border-gray-200 transition-all duration-300">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <CategoryBadge category={idea.category} />
              
              {/* Validation Score Badge */}
              {buildPercentage !== null && (
                <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  buildPercentage >= 60
                    ? 'bg-violet-50 text-violet-700 border-violet-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {buildPercentage >= 60 ? (
                    <>
                      <ThumbsUp className="w-3 h-3 text-violet-600 fill-violet-200" />
                      {buildPercentage}% Build
                    </>
                  ) : (
                    <>
                      <ThumbsDown className="w-3 h-3 text-rose-500 fill-rose-100" />
                      {100 - buildPercentage}% Skip
                    </>
                  )}
                </span>
              )}

              {idea.status && idea.status !== 'validating' && (
                <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  idea.status === 'building'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-250'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  {idea.status === 'building' ? (
                    <>
                      <Rocket className="w-3 h-3 text-emerald-600" />
                      Building
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3 text-slate-500" />
                      Skipped
                    </>
                  )}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-violet-600 transition-colors line-clamp-2">
              {idea.title}
            </h3>
            <p className="text-gray-500 text-sm mt-2 line-clamp-2">
              {idea.description || idea.problem}
            </p>
          </div>
          
          {/* Vote Buttons (Prevent click propagation to card navigation) */}
          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <VoteButton
              ideaId={idea.id}
              initialBuildVotes={idea.build_votes_count || 0}
              initialSkipVotes={idea.skip_votes_count || 0}
              initialVoteType={votedType}
              size="sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Avatar url={idea.profiles?.avatar_url} name={idea.profiles?.username} size="sm" />
            <span className="font-medium text-gray-700">
              {idea.profiles?.full_name || idea.profiles?.username || 'Anonymous'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-400 font-semibold">
            <MessageSquare className="w-4 h-4 text-gray-300" />
            <span>{idea.comments_count}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
