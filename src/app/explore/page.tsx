'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Idea, CATEGORIES } from '@/types/database';
import IdeaCard from '@/components/IdeaCard';
import EmptyState from '@/components/EmptyState';
import { Search, Filter, Lightbulb } from 'lucide-react';

export default function ExplorePage() {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, 'build' | 'skip'>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');
  const supabase = createClient();

  useEffect(() => {
    fetchIdeas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, sortBy, user]);

  const fetchIdeas = async () => {
    setLoading(true);
    let query = supabase
      .from('ideas')
      .select('*, profiles(*)');

    if (selectedCategory) {
      query = query.eq('category', selectedCategory);
    }

    if (sortBy === 'popular') {
      query = query.order('build_votes_count', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data } = await query;
    setIdeas(data || []);

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

  const filteredIdeas = ideas.filter((idea) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      idea.title.toLowerCase().includes(q) ||
      idea.problem.toLowerCase().includes(q) ||
      idea.solution.toLowerCase().includes(q) ||
      (idea.description && idea.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Explore Ideas</h1>
        <p className="text-gray-500 mt-1">Discover and vote on startup ideas from the community</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ideas..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* Category filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900 bg-white cursor-pointer min-w-40"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setSortBy('newest')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                sortBy === 'newest'
                  ? 'bg-violet-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Newest
            </button>
            <button
              onClick={() => setSortBy('popular')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                sortBy === 'popular'
                  ? 'bg-violet-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Popular
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        </div>
      ) : filteredIdeas.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No ideas found"
          description={searchQuery || selectedCategory ? 'Try adjusting your search or filters' : 'Be the first to post a startup idea!'}
          actionLabel="Post Your Idea"
          actionHref="/ideas/new"
        />
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {filteredIdeas.length} idea{filteredIdeas.length !== 1 ? 's' : ''} found
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIdeas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                votedType={userVotes[idea.id] || null}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
