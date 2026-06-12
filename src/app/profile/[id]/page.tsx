'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Profile, Idea } from '@/types/database';
import IdeaCard from '@/components/IdeaCard';
import EmptyState from '@/components/EmptyState';
import Avatar from '@/components/Avatar';
import { MessageCircle, Calendar, Lightbulb, User, Users, UserPlus, UserCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<Profile | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, 'build' | 'skip'>>({});
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Connections Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'followers' | 'following'>('followers');
  const [modalUsers, setModalUsers] = useState<Profile[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (prof) {
      setProfileData(prof);

      const { data: userIdeas } = await supabase
        .from('ideas')
        .select('*, profiles(*)')
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      setIdeas(userIdeas || []);

      if (user) {
        const ideaIds = (userIdeas || []).map((i: Idea) => i.id);
        if (ideaIds.length > 0) {
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
      }
      // Fetch followers and following stats
      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', id);
      setFollowersCount(followers || 0);

      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', id);
      setFollowingCount(following || 0);

      // Check follow connection
      if (user && user.id !== id) {
        const { data: followData } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', user.id)
          .eq('following_id', id)
          .maybeSingle();
        setIsFollowing(!!followData);
      }
    }
    setLoading(false);
  };

  const handleMessage = async () => {
    if (!user) {
      toast.error('Please sign in to send messages');
      router.push('/auth/login');
      return;
    }

    if (user.id === id) {
      toast.error("You can't message yourself");
      return;
    }

    // Check for existing conversation
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${id}),and(participant_1.eq.${id},participant_2.eq.${user.id})`)
      .single();

    if (existing) {
      router.push(`/messages?conv=${existing.id}`);
      return;
    }

    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({ participant_1: user.id, participant_2: id })
      .select()
      .single();

    if (error) {
      toast.error('Failed to start conversation');
    } else if (newConv) {
      router.push(`/messages?conv=${newConv.id}`);
    }
  };

  const handleFollowToggle = async () => {
    if (!user) {
      toast.error('Please sign in to follow users');
      router.push('/auth/login');
      return;
    }
    
    setFollowLoading(true);
    
    if (isFollowing) {
      // Unfollow
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', id);
        
      if (error) {
        toast.error('Failed to unfollow user');
      } else {
        setIsFollowing(false);
        setFollowersCount((prev) => Math.max(0, prev - 1));
        toast.success(`Unfollowed ${profileData?.username}`);
      }
    } else {
      // Follow
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: id });
        
      if (error) {
        toast.error('Failed to follow user');
      } else {
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
        toast.success(`Following ${profileData?.username}!`);
      }
    }
    setFollowLoading(false);
  };

  const handleShowConnections = async (type: 'followers' | 'following') => {
    setModalType(type);
    setShowModal(true);
    setModalLoading(true);
    setModalUsers([]);

    try {
      if (type === 'followers') {
        const { data: followsData } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', id);

        if (followsData && followsData.length > 0) {
          const followerIds = followsData.map((f: any) => f.follower_id);
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('*')
            .in('id', followerIds);
          setModalUsers(profilesData || []);
        }
      } else {
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', id);

        if (followingData && followingData.length > 0) {
          const followingIds = followingData.map((f: any) => f.following_id);
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('*')
            .in('id', followingIds);
          setModalUsers(profilesData || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err);
      toast.error('Failed to load users');
    } finally {
      setModalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EmptyState icon={User} title="User not found" description="This user doesn't exist or has been removed." />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <Avatar url={profileData.avatar_url} name={profileData.username} size="xxl" />
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-gray-900">{profileData.full_name || profileData.username}</h1>
            <p className="text-gray-500 mt-0.5">@{profileData.username}</p>
            {profileData.bio && (
              <p className="text-gray-600 mt-3">{profileData.bio}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 mt-4 justify-center sm:justify-start">
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                Joined {new Date(profileData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Lightbulb className="w-4 h-4" />
                {ideas.length} idea{ideas.length !== 1 ? 's' : ''}
              </div>
              <button
                onClick={() => handleShowConnections('followers')}
                className="flex items-center gap-1.5 text-sm text-gray-500 font-medium hover:text-violet-600 transition-colors cursor-pointer"
              >
                <Users className="w-4 h-4 text-gray-400" />
                <span>{followersCount} follower{followersCount !== 1 ? 's' : ''}</span>
              </button>
              <button
                onClick={() => handleShowConnections('following')}
                className="flex items-center gap-1.5 text-sm text-gray-500 font-medium hover:text-violet-600 transition-colors cursor-pointer"
              >
                <Users className="w-4 h-4 text-gray-400" />
                <span>{followingCount} following</span>
              </button>
            </div>
          </div>
          {user && user.id !== id && (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={handleFollowToggle}
                disabled={followLoading}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all border-2 w-full sm:w-auto ${
                  isFollowing
                    ? 'bg-violet-55 border-violet-400 text-violet-700 hover:bg-violet-100'
                    : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/25'
                } disabled:opacity-50`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Follow
                  </>
                )}
              </button>
              <button
                onClick={handleMessage}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all text-sm w-full sm:w-auto"
              >
                <MessageCircle className="w-4 h-4 text-gray-400" />
                Send Message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Ideas */}
      <h2 className="text-xl font-bold text-gray-900 mb-4">Posted Ideas</h2>
      {ideas.length === 0 ? (
        <EmptyState icon={Lightbulb} title="No ideas yet" description="This user hasn't posted any ideas yet." />
      ) : (
        <div className="grid gap-4">
          {ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} votedType={userVotes[idea.id] || null} />
          ))}
        </div>
      )}

      {/* Connections Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white/95 backdrop-blur-md rounded-3xl max-w-md w-full border border-gray-100 shadow-2xl overflow-hidden z-10 animate-scaleUp">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 capitalize">
                {modalType}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="p-4 max-h-[60vh] overflow-y-auto min-h-[200px]">
              {modalLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                </div>
              ) : modalUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-sm">
                  <Users className="w-12 h-12 mb-3 opacity-30" />
                  <p>No {modalType} yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {modalUsers.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setShowModal(false);
                        router.push(`/profile/${item.id}`);
                      }}
                      className="w-full p-3 flex items-center gap-3 rounded-2xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all text-left"
                    >
                      <Avatar url={item.avatar_url} name={item.username} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">
                          {item.full_name || item.username}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          @{item.username}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
