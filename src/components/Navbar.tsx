'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Avatar from './Avatar';
import { createClient } from '@/lib/supabase/client';
import {
  Rocket,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  MessageCircle,
  Compass,
  PlusCircle,
  User,
  Bell,
  Check,
  CheckCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, profile, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
    router.push('/');
    router.refresh();
  };

  useEffect(() => {
    if (!user) {
      setUnreadMessages(0);
      setNotifications([]);
      setUnreadNotifications(0);
      return;
    }

    fetchUnreadMessages();
    fetchNotifications();

    // Set up Realtime subscriptions
    // 1. Listen for new messages in database
    const messagesChannel = (supabase.channel('navbar_messages') as any)
      .on(
        'postgres_changes',
        {
          event: 'insert',
          schema: 'public',
          table: 'messages',
        },
        async (payload: any) => {
          if (payload.new.sender_id !== user.id) {
            // Verify conversation belongs to user
            const { data: conv } = await supabase
              .from('conversations')
              .select('id')
              .eq('id', payload.new.conversation_id)
              .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
              .maybeSingle();

            if (conv) {
              setUnreadMessages((prev) => prev + 1);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'update',
          schema: 'public',
          table: 'messages',
        },
        async (payload: any) => {
          if (payload.new.sender_id !== user.id) {
            fetchUnreadMessages();
          }
        }
      )
      .subscribe();

    // 2. Listen for new notifications
    const notificationsChannel = (supabase.channel('navbar_notifications') as any)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [user]);

  const fetchUnreadMessages = async () => {
    if (!user) return;
    try {
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`);

      if (convs && convs.length > 0) {
        const convIds = convs.map((c: any) => c.id);
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', convIds)
          .neq('sender_id', user.id)
          .eq('read', false);

        setUnreadMessages(count || 0);
      } else {
        setUnreadMessages(0);
      }
    } catch (e) {
      console.error('Error fetching messages count:', e);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*, actor_profile:profiles!actor_id(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        setNotifications(data);
        const unreadCount = data.filter((n: any) => !n.read).length;
        setUnreadNotifications(unreadCount);
      }
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  };

  const handleMarkAsRead = async (notifId: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', notifId);
    fetchNotifications();
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    fetchNotifications();
  };

  const navLinks = [
    { href: '/explore', label: 'Explore', icon: Compass },
    { href: '/ideas/new', label: 'Post Idea', icon: PlusCircle },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group" onClick={() => setMobileOpen(false)}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              Build<span className="text-violet-600">Or</span>Skip
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-violet-600 hover:bg-violet-50 transition-all"
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-3">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
            ) : user ? (
              <>
                {/* Direct Message Icon Link */}
                <Link
                  href="/messages"
                  className="relative p-2 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all"
                  title="Messages"
                >
                  <MessageCircle className="w-5.5 h-5.5" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 bg-red-500 text-[9px] font-bold text-white rounded-full flex items-center justify-center px-1 border-2 border-white">
                      {unreadMessages}
                    </span>
                  )}
                </Link>

                {/* Notifications Bell Icon Button */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setNotificationsOpen(!notificationsOpen);
                      setDropdownOpen(false);
                    }}
                    className={`relative p-2 rounded-xl transition-all ${
                      notificationsOpen
                        ? 'bg-violet-50 text-violet-600'
                        : 'text-gray-500 hover:text-violet-600 hover:bg-violet-50'
                    }`}
                    title="Notifications"
                  >
                    <Bell className="w-5.5 h-5.5" />
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 bg-red-500 text-[9px] font-bold text-white rounded-full flex items-center justify-center px-1 border-2 border-white">
                        {unreadNotifications}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown Panel */}
                  {notificationsOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                      <div className="fixed top-16 right-4 left-4 md:absolute md:top-auto md:left-auto md:right-0 md:mt-2 md:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 py-3 z-50 animate-fadeIn">
                        <div className="flex items-center justify-between px-4 pb-2 border-b border-gray-100">
                          <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                            <Bell className="w-4 h-4 text-violet-600" />
                            Notifications
                          </span>
                          {unreadNotifications > 0 && (
                            <button
                              onClick={handleMarkAllAsRead}
                              className="text-xs text-violet-600 hover:text-violet-700 font-semibold transition-colors flex items-center gap-1"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              Mark all as read
                            </button>
                          )}
                        </div>

                        <div className="max-h-80 overflow-y-auto mt-2 divide-y divide-gray-50">
                          {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-400 text-xs">
                              No notifications yet
                            </div>
                          ) : (
                            notifications.map((notif) => (
                              <div
                                key={notif.id}
                                className={`px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                                  !notif.read ? 'bg-violet-50/30' : ''
                                }`}
                              >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                  {notif.actor_profile?.username?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-gray-800 leading-normal">
                                    <Link
                                      href={`/profile/${notif.actor_profile?.id}`}
                                      className="font-semibold text-gray-900 hover:text-violet-600"
                                      onClick={() => setNotificationsOpen(false)}
                                    >
                                      {notif.actor_profile?.full_name ||
                                        notif.actor_profile?.username ||
                                        'Someone'}
                                    </Link>{' '}
                                    started following you.
                                  </p>
                                  <span className="text-[10px] text-gray-400 block mt-1">
                                    {new Date(notif.created_at).toLocaleDateString([], {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                                {!notif.read && (
                                  <button
                                    onClick={() => handleMarkAsRead(notif.id)}
                                    className="w-5 h-5 rounded-full bg-violet-100 hover:bg-violet-200 flex items-center justify-center text-violet-600 flex-shrink-0 transition-colors"
                                    title="Mark as read"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setDropdownOpen(!dropdownOpen);
                      setNotificationsOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <Avatar url={profile?.avatar_url} name={profile?.username} size="md" />
                    <span className="text-sm font-medium text-gray-700 max-w-24 truncate">
                      {profile?.username || 'User'}
                    </span>
                  </button>

                  {dropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Dashboard
                        </Link>
                        <Link
                          href="/messages"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <MessageCircle className="w-4 h-4" />
                          Messages
                        </Link>
                        <Link
                          href={`/profile/${user.id}`}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <User className="w-4 h-4" />
                          Profile
                        </Link>
                        <hr className="my-1 border-gray-100" />
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            handleSignOut();
                          }}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-500/25"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile quick actions */}
          {user && (
            <div className="flex md:hidden items-center gap-1 mr-1">
              <Link
                href="/messages"
                className="relative p-2 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all"
                onClick={() => {
                  setNotificationsOpen(false);
                  setMobileOpen(false);
                }}
              >
                <MessageCircle className="w-5 h-5" />
                {unreadMessages > 0 && (
                  <span className="absolute top-1 right-1 min-w-3.5 h-3.5 bg-red-500 text-[8px] font-bold text-white rounded-full flex items-center justify-center px-0.5 border border-white animate-pulse">
                    {unreadMessages}
                  </span>
                )}
              </Link>

              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setMobileOpen(false);
                }}
                className={`relative p-2 rounded-xl transition-all ${
                  notificationsOpen ? 'bg-violet-50 text-violet-600' : 'text-gray-500 hover:text-violet-600'
                }`}
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 min-w-3.5 h-3.5 bg-red-500 text-[8px] font-bold text-white rounded-full flex items-center justify-center px-0.5 border border-white">
                    {unreadNotifications}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => {
              setMobileOpen(!mobileOpen);
              setNotificationsOpen(false);
            }}
            className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-violet-50 hover:text-violet-600 transition-all"
              onClick={() => setMobileOpen(false)}
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link href="/dashboard" className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-violet-50 hover:text-violet-600 transition-all" onClick={() => setMobileOpen(false)}>
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <Link href="/messages" className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-violet-50 hover:text-violet-600 transition-all" onClick={() => setMobileOpen(false)}>
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Messages
                </div>
                {unreadMessages > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-[10px] font-bold text-white rounded-full">
                    {unreadMessages}
                  </span>
                )}
              </Link>
              <button
                onClick={() => { setMobileOpen(false); handleSignOut(); }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all w-full text-left"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link href="/auth/login" className="flex-1 text-center px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all" onClick={() => setMobileOpen(false)}>Sign In</Link>
              <Link href="/auth/signup" className="flex-1 text-center px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl" onClick={() => setMobileOpen(false)}>Get Started</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
