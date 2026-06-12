'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Idea } from '@/types/database';
import EmptyState from '@/components/EmptyState';
import CategoryBadge from '@/components/CategoryBadge';
import Avatar from '@/components/Avatar';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  Lightbulb,
  MessageSquare,
  Pencil,
  Trash2,
  Plus,
  User,
  Save,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [votesData, setVotesData] = useState<any[]>([]);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      fetchDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setFullName(profile.full_name || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const fetchDashboard = async () => {
    setLoading(true);

    const { data: userIdeas } = await supabase
      .from('ideas')
      .select('*, profiles(*)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    const myIdeas = userIdeas || [];
    setIdeas(myIdeas);

    if (myIdeas.length > 0) {
      const ideaIds = myIdeas.map((i: Idea) => i.id);
      
      // Fetch votes for these ideas
      const { data: votes } = await supabase
        .from('votes')
        .select('idea_id, vote_type, skip_reason, created_at')
        .in('idea_id', ideaIds);
      
      setVotesData(votes || []);
      setSelectedIdeaId((prev) => prev || myIdeas[0].id);
    }

    setLoading(false);
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user!.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast.success('Photo uploaded! Save profile to apply changes.');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image. Please check if your "avatars" bucket is public in Supabase, or paste a photo URL directly.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteIdea = async (ideaId: string) => {
    if (!confirm('Are you sure you want to delete this idea? This cannot be undone.')) return;

    setDeletingId(ideaId);
    const { error } = await supabase.from('ideas').delete().eq('id', ideaId);

    if (error) {
      toast.error('Failed to delete idea');
    } else {
      toast.success('Idea deleted');
      setIdeas(ideas.filter((i) => i.id !== ideaId));
      if (selectedIdeaId === ideaId) {
        setSelectedIdeaId(null);
      }
    }
    setDeletingId(null);
  };

  const handleSaveProfile = async () => {
    if (!username.trim()) {
      toast.error('Username is required');
      return;
    }

    setSavingProfile(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        username: username.trim(),
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      })
      .eq('id', user!.id);

    if (error) {
      if (error.code === '23505') {
        toast.error('Username already taken');
      } else {
        toast.error('Failed to update profile');
      }
    } else {
      toast.success('Profile updated!');
      setEditingProfile(false);
      await refreshProfile();
    }
    setSavingProfile(false);
  };

  // Aggregations
  const totalBuildVotes = ideas.reduce((acc, i) => acc + (i.build_votes_count || 0), 0);
  const totalSkipVotes = ideas.reduce((acc, i) => acc + (i.skip_votes_count || 0), 0);
  const totalComments = ideas.reduce((acc, i) => acc + (i.comments_count || 0), 0);

  // Selected Idea Calculations
  const selectedIdea = ideas.find((i) => i.id === selectedIdeaId);
  const selectedIdeaVotes = votesData.filter((v) => v.idea_id === selectedIdeaId);
  
  const selectedBuild = selectedIdea?.build_votes_count || 0;
  const selectedSkip = selectedIdea?.skip_votes_count || 0;
  const selectedTotal = selectedBuild + selectedSkip;
  
  const buildPct = selectedTotal > 0 ? Math.round((selectedBuild / selectedTotal) * 100) : 50;
  const skipPct = selectedTotal > 0 ? Math.round((selectedSkip / selectedTotal) * 100) : 50;

  // Donut chart path calculations
  const radius = 35;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (buildPct / 100) * circumference;

  // Skip Reasons aggregations
  const skipReasonCounts = {
    market_small: 0,
    already_exists: 0,
    too_hard: 0,
    no_monetization: 0,
    other: 0,
  };

  selectedIdeaVotes.forEach((v) => {
    if (v.vote_type === 'skip' && v.skip_reason) {
      const reason = v.skip_reason as keyof typeof skipReasonCounts;
      if (skipReasonCounts[reason] !== undefined) {
        skipReasonCounts[reason]++;
      }
    }
  });

  const reasonsData = [
    { key: 'market_small', label: '🛒 Market is too small', count: skipReasonCounts.market_small, color: 'bg-amber-400' },
    { key: 'already_exists', label: '🔄 Similar product exists', count: skipReasonCounts.already_exists, color: 'bg-blue-400' },
    { key: 'too_hard', label: '🛠️ Too complex to build', count: skipReasonCounts.too_hard, color: 'bg-rose-450' },
    { key: 'no_monetization', label: '💸 Hard to monetize', count: skipReasonCounts.no_monetization, color: 'bg-emerald-400' },
    { key: 'other', label: '❓ Other / Unclear value', count: skipReasonCounts.other, color: 'bg-slate-400' },
  ];

  const maxReasonCount = Math.max(...reasonsData.map((d) => d.count), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8 text-violet-600" />
            Dashboard
          </h1>
          <p className="text-gray-500 mt-1">Manage your ideas and profile</p>
        </div>
        <Link
          href="/ideas/new"
          className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-500/25"
        >
          <Plus className="w-4 h-4" />
          New Idea
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-violet-100 mb-2">
            <Lightbulb className="w-5 h-5 text-violet-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{ideas.length}</p>
          <p className="text-sm text-gray-500 font-semibold">Ideas</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-violet-50 text-violet-650 mb-2">
            <ThumbsUp className="w-5 h-5 text-violet-655" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalBuildVotes}</p>
          <p className="text-sm text-gray-500 font-semibold">Build Votes</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-rose-50 text-rose-500 mb-2">
            <ThumbsDown className="w-5 h-5 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalSkipVotes}</p>
          <p className="text-sm text-gray-500 font-semibold">Skip Votes</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 mb-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalComments}</p>
          <p className="text-sm text-gray-500 font-semibold">Comments</p>
        </div>
      </div>

      {/* Analytics Graph Dashboard */}
      {ideas.length > 0 && selectedIdeaId && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-violet-650" />
              Startup Idea Analytics
            </h2>
            
            <select
              value={selectedIdeaId || ''}
              onChange={(e) => setSelectedIdeaId(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 focus:border-violet-500 outline-none text-gray-900 bg-white cursor-pointer font-semibold text-sm max-w-xs truncate"
            >
              {ideas.map((idea) => (
                <option key={idea.id} value={idea.id}>
                  {idea.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid md:grid-cols-5 gap-8 items-start">
            {/* Left Donut validation meter */}
            <div className="md:col-span-2 flex flex-col items-center justify-center bg-gray-50/50 p-6 rounded-2xl border border-gray-100/50">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 144 144">
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    className="stroke-rose-100 fill-none"
                    strokeWidth={strokeWidth}
                    style={{ stroke: '#fecdd3' }} // Rose 200 for Skip background
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    className="stroke-violet-600 fill-none transition-all duration-1000 ease-out"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={selectedTotal > 0 ? strokeDashoffset : circumference}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-3xl font-black text-gray-900">
                    {selectedTotal > 0 ? buildPct : 0}%
                  </span>
                  <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider mt-0.5">
                    Build Score
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-2.5 w-full">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-violet-600" />
                    <span className="text-gray-600 font-medium">Build Votes</span>
                  </div>
                  <span className="font-bold text-gray-900">{selectedBuild}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-400" />
                    <span className="text-gray-600 font-medium">Skip Votes</span>
                  </div>
                  <span className="font-bold text-gray-900">{selectedSkip}</span>
                </div>
                <div className="pt-2.5 border-t border-gray-200 text-center text-xs text-gray-400 font-medium">
                  Total Validation Responses: {selectedTotal}
                </div>
              </div>
            </div>

            {/* Right Skip Reasons bar chart */}
            <div className="md:col-span-3 space-y-4">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                Why are people skipping?
              </h3>
              
              {selectedSkip === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 bg-gray-50/20 border border-dashed border-gray-200 rounded-2xl text-center text-gray-400">
                  <ThumbsUp className="w-10 h-10 text-violet-200 mb-2" />
                  <p className="text-sm font-medium">No skips yet! Perfect score so far.</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    If users mark this idea as "Skip", their reasons will be charted here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reasonsData.map((item) => {
                    const percentage = Math.round((item.count / maxReasonCount) * 100);
                    const pctOfSkips = Math.round((item.count / selectedSkip) * 100);
                    return (
                      <div key={item.key} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-gray-700">
                          <span>{item.label}</span>
                          <span className="font-bold text-gray-900">
                            {item.count} ({pctOfSkips}%)
                          </span>
                        </div>
                        <div className="w-full h-3.5 bg-gray-100/50 rounded-xl overflow-hidden border border-gray-200/30 relative">
                          <div
                            style={{ width: `${item.count > 0 ? percentage : 0}%` }}
                            className={`h-full transition-all duration-700 ease-out rounded-xl ${
                              item.key === 'market_small' ? 'bg-amber-450' :
                              item.key === 'already_exists' ? 'bg-blue-450' :
                              item.key === 'too_hard' ? 'bg-rose-400' :
                              item.key === 'no_monetization' ? 'bg-emerald-450' : 'bg-slate-400'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile section */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-violet-600" />
            Profile Settings
          </h2>
          <button
            onClick={() => setEditingProfile(!editingProfile)}
            className="text-sm text-violet-600 font-semibold hover:text-violet-700 transition-colors"
          >
            {editingProfile ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editingProfile ? (
          <div className="space-y-4">
            {/* Avatar Editing Section */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 mb-4">
              <Avatar url={avatarUrl} name={username} size="xl" />
              <div className="flex-1 space-y-3 w-full">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Upload Profile Photo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadAvatar}
                    disabled={uploading}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 cursor-pointer disabled:opacity-50"
                  />
                  {uploading && <p className="text-xs text-violet-600 mt-1 animate-pulse">Uploading photo...</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Or Paste Image URL
                  </label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 outline-none transition-all text-gray-900"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900 resize-none"
                rows={3}
                placeholder="Tell us about yourself..."
              />
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile || uploading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50"
            >
              {savingProfile ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Profile
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Avatar url={profile?.avatar_url} name={profile?.username} size="xl" />
            <div>
              <p className="font-semibold text-gray-900">{profile?.full_name || profile?.username}</p>
              <p className="text-sm text-gray-500">@{profile?.username}</p>
              {profile?.bio && <p className="text-sm text-gray-600 mt-1">{profile.bio}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Ideas list */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Your Startup Ideas</h2>
        {ideas.length === 0 ? (
          <EmptyState
            icon={Lightbulb}
            title="No ideas yet"
            description="Post your first startup idea and start getting feedback!"
            actionLabel="Post Your Idea"
            actionHref="/ideas/new"
          />
        ) : (
          <div className="space-y-3">
            {ideas.map((idea) => (
              <div
                key={idea.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <CategoryBadge category={idea.category} />
                      <span className="text-xs text-gray-400">
                        {new Date(idea.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <Link
                      href={`/ideas/${idea.id}`}
                      className="text-lg font-bold text-gray-900 hover:text-violet-600 transition-colors"
                    >
                      {idea.title}
                    </Link>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-550">
                      <span className="flex items-center gap-1 font-semibold">
                        <ThumbsUp className="w-4 h-4 text-violet-500" />
                        {idea.build_votes_count || 0} build
                      </span>
                      <span className="flex items-center gap-1 font-semibold">
                        <ThumbsDown className="w-4 h-4 text-rose-400" />
                        {idea.skip_votes_count || 0} skip
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4 text-gray-300" />
                        {idea.comments_count || 0} comments
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Link
                      href={`/ideas/${idea.id}/edit`}
                      className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteIdea(idea.id)}
                      disabled={deletingId === idea.id}
                      className="p-2 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingId === idea.id ? (
                        <div className="w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
