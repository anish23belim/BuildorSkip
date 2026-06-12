'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Idea } from '@/types/database';
import IdeaCard from '@/components/IdeaCard';
import Link from 'next/link';
import {
  Rocket,
  TrendingUp,
  Users,
  MessageSquare,
  ChevronUp,
  ArrowRight,
  Sparkles,
  Lightbulb,
  Shield,
} from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const [trendingIdeas, setTrendingIdeas] = useState<Idea[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, 'build' | 'skip'>>({});
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchTrending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchTrending = async () => {
    const { data } = await supabase
      .from('ideas')
      .select('*, profiles(*)')
      .order('build_votes_count', { ascending: false })
      .limit(6);

    setTrendingIdeas(data || []);

    if (user && data && data.length > 0) {
      const ideaIds = data.map((i: Idea) => i.id);
      const { data: votes } = await supabase
        .from('votes')
        .select('idea_id, vote_type')
        .eq('user_id', user.id)
        .in('idea_id', ideaIds);
      
      const voteMap: Record<string, 'build' | 'skip'> = {};
      if (votes) {
        votes.forEach((v: { idea_id: string; vote_type: 'build' | 'skip' }) => {
          voteMap[v.idea_id] = v.vote_type;
        });
      }
      setUserVotes(voteMap);
    }

    setLoading(false);
  };

  return (
    <div className="animate-fadeIn">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-indigo-50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-violet-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-700 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Free startup idea validation platform
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
              Validate Your Startup Idea{' '}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                Before You Build
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Post your startup ideas, get honest votes and feedback from the community,
              connect with other founders, and validate your concept before investing time and money.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
              <Link
                href="/ideas/new"
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl font-semibold text-lg hover:from-violet-700 hover:to-indigo-700 transition-all shadow-xl shadow-violet-500/25 flex items-center justify-center gap-2 group"
              >
                <Lightbulb className="w-5 h-5" />
                Post Your Idea
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/explore"
                className="w-full sm:w-auto px-8 py-4 bg-white text-gray-700 rounded-2xl font-semibold text-lg border-2 border-gray-200 hover:border-violet-300 hover:text-violet-600 transition-all flex items-center justify-center gap-2"
              >
                Explore Ideas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Lightbulb, label: 'Ideas Posted', value: 'Community', color: 'from-violet-500 to-indigo-500' },
            { icon: ChevronUp, label: 'Votes Cast', value: 'Driven', color: 'from-blue-500 to-cyan-500' },
            { icon: MessageSquare, label: 'Feedback Given', value: 'Honest', color: 'from-emerald-500 to-teal-500' },
            { icon: Users, label: 'Founders', value: 'Connected', color: 'from-amber-500 to-orange-500' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border border-gray-100 p-5 text-center hover:shadow-md transition-shadow"
            >
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} mb-3`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-lg font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
          <p className="text-gray-500 mt-2">Three simple steps to validate your startup idea</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              icon: Lightbulb,
              title: 'Post Your Idea',
              description: 'Share your startup concept with the community. Describe the problem, your solution, and target audience.',
            },
            {
              step: '02',
              icon: TrendingUp,
              title: 'Get Votes & Feedback',
              description: 'The community votes and shares honest feedback. See if your idea resonates with real people.',
            },
            {
              step: '03',
              icon: Shield,
              title: 'Build or Skip',
              description: 'Use the data to make an informed decision. Build what people want, skip what they don\'t.',
            },
          ].map((item) => (
            <div key={item.step} className="bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-lg transition-all group">
              <div className="text-5xl font-black text-gray-100 group-hover:text-violet-100 transition-colors mb-4">
                {item.step}
              </div>
              <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center mb-4 group-hover:bg-violet-100 transition-colors">
                <item.icon className="w-6 h-6 text-violet-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-500">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trending Ideas */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-violet-600" />
              <h2 className="text-2xl font-bold text-gray-900">Trending Ideas</h2>
            </div>
            <p className="text-gray-500 text-sm">Most popular ideas from the community</p>
          </div>
          <Link
            href="/explore"
            className="text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors flex items-center gap-1"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : trendingIdeas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Rocket className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No ideas yet</h3>
            <p className="text-gray-500 mb-4">Be the first to post a startup idea!</p>
            <Link
              href="/ideas/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-500/25"
            >
              Post Your Idea
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendingIdeas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                votedType={userVotes[idea.id] || null}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
