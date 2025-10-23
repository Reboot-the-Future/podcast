"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, FileAudio, RefreshCw, AlertCircle, Clock, BookOpen, TrendingUp, BarChart3 } from "lucide-react";

interface Episode {
  id: number;
  title: string;
  date_published: string;
  status: string;
  buzzsprout_episode_id?: string;
}

interface Blog {
  id: number;
  title: string;
  date: string;
  createdAt: string;
}

interface DashboardStats {
  totalEpisodes: number;
  published: number;
  recentEpisodes: Episode[];
  totalBlogs: number;
  recentBlogs: Blog[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalEpisodes: 0,
    published: 0,
    recentEpisodes: [],
    totalBlogs: 0,
    recentBlogs: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    document.title = "Dashboard › Reboot Admin";
  }, []);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    fetchStats();
  }, [router]);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      if (!token) {
        router.replace("/admin/login");
        return;
      }

      // Fetch episodes stats
      const episodesRes = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (episodesRes.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("admin_token");
        }
        router.replace("/admin/login");
        return;
      }

      if (!episodesRes.ok) throw new Error(`Failed to fetch episode stats: ${episodesRes.status}`);
      const episodesData = await episodesRes.json();

      // Fetch blogs
      const blogsRes = await fetch("/api/blogs");
      const blogsData = await blogsRes.json();

      const sortedEpisodes = Array.isArray(episodesData.recentEpisodes)
        ? [...episodesData.recentEpisodes].sort(
            (a: Episode, b: Episode) =>
              new Date(b.date_published).getTime() - new Date(a.date_published).getTime()
          )
        : [];

      const sortedBlogs = Array.isArray(blogsData.blogs)
        ? [...blogsData.blogs].sort(
            (a: Blog, b: Blog) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        : [];

      setStats({
        totalEpisodes: episodesData.totalEpisodes || 0,
        published: episodesData.published || 0,
        recentEpisodes: sortedEpisodes,
        totalBlogs: blogsData.blogs?.length || 0,
        recentBlogs: sortedBlogs,
      });
    } catch (error: any) {
      console.error("Error fetching stats:", error);
      setError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-[#0f1c1c] to-[#1a2828]">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-[#ffa9fc]/30 border-t-[#ffa9fc] rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 animate-pulse rounded-full w-16 h-16 border border-[#ffa9fc]/20 mx-auto"></div>
          </div>
          <p className="text-gray-400 font-medium mb-2">Loading dashboard...</p>
          <div className="flex justify-center space-x-1">
            <div className="w-2 h-2 bg-[#ffa9fc] rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-[#ffa9fc] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-[#ffa9fc] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-8 text-center max-w-2xl mx-auto">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-2xl font-bold mb-2 text-red-300">Error Loading Dashboard</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => fetchStats()}
            className="px-8 py-3 bg-[#ffa9fc] hover:bg-[#ff8df7] text-[#0f1c1c] rounded-xl font-bold transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Episodes",
      value: stats.totalEpisodes,
      icon: FileAudio,
      bgColor: "from-blue-500/20 to-blue-600/10",
      iconColor: "text-blue-400",
      borderColor: "border-blue-500/30",
    },
    {
      title: "Published Episodes",
      value: stats.published,
      icon: Eye,
      bgColor: "from-green-500/20 to-green-600/10",
      iconColor: "text-green-400",
      borderColor: "border-green-500/30",
    },
    {
      title: "Total Blogs",
      value: stats.totalBlogs,
      icon: BookOpen,
      bgColor: "from-purple-500/20 to-purple-600/10",
      iconColor: "text-purple-400",
      borderColor: "border-purple-500/30",
    },
  ];

  return (
    <div className="p-4 md:p-8 space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-400">Welcome back! Here's your podcast & content overview.</p>
        </div>
        <button
          onClick={() => fetchStats(true)}
          disabled={refreshing}
          className="px-6 py-3 bg-[#ffa9fc] hover:bg-[#ff8df7] text-[#0f1c1c] rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50 hover:scale-105 active:scale-95 shadow-lg shadow-[#ffa9fc]/20 focus:outline-none focus:ring-2 focus:ring-[#ffa9fc] focus:ring-offset-2"
          aria-label={refreshing ? "Refreshing data" : "Refresh dashboard data"}
        >
          <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className={`bg-gradient-to-br ${stat.bgColor} rounded-2xl p-6 border ${stat.borderColor} backdrop-blur-sm hover:scale-105 transition-transform cursor-pointer`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-[#0f1c1c]/50`}>
                  <Icon className={stat.iconColor} size={24} />
                </div>
              </div>
              <div className="text-4xl font-bold mb-1">{stat.value.toLocaleString()}</div>
              <div className="text-sm text-gray-400">{stat.title}</div>
            </div>
          );
        })}
      </div>

      {/* Recent Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Episodes */}
        <div className="bg-gradient-to-br from-[#1a2828] to-[#0f1c1c] rounded-2xl border border-[#2a3838] p-6">
          <div>
            <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
              <FileAudio size={24} className="text-blue-400" />
              Recent Episodes
            </h2>
            <p className="text-gray-400 text-sm">Latest {stats.recentEpisodes.length} episodes</p>
          </div>

          {!stats.recentEpisodes || stats.recentEpisodes.length === 0 ? (
            <div className="text-center py-12">
              <FileAudio size={48} className="mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400 mb-1 text-sm">No episodes yet</p>
              <p className="text-gray-500 text-xs">Start creating content for your podcast</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentEpisodes.slice(0, 5).map((episode) => (
                <div
                  key={episode.id}
                  className="flex items-center justify-between p-4 rounded-xl transition-all cursor-pointer bg-[#0f1c1c]/50 hover:bg-[#0f1c1c] border border-transparent hover:border-[#2a3838]"
                  onClick={() => router.push("/admin/episodes")}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-white truncate text-sm">{episode.title}</h3>
                      {episode.buzzsprout_episode_id && (
                        <span className="text-xs px-2 py-1 rounded-full bg-[#ffa9fc]/10 text-[#ffa9fc] border border-[#ffa9fc]/30 flex-shrink-0">
                          BS
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(episode.date_published).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          episode.status === "published"
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                        }`}
                      >
                        {episode.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Blogs */}
        <div className="bg-gradient-to-br from-[#1a2828] to-[#0f1c1c] rounded-2xl border border-[#2a3838] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
                <BookOpen size={24} className="text-purple-400" />
                Recent Blogs
              </h2>
              <p className="text-gray-400 text-sm">Latest {stats.recentBlogs.length} posts</p>
            </div>
          </div>

          {!stats.recentBlogs || stats.recentBlogs.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen size={48} className="mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400 mb-1 text-sm">No blogs yet</p>
              <p className="text-gray-500 text-xs">Start writing and sharing insights</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentBlogs.slice(0, 5).map((blog) => (
                <div
                  key={blog.id}
                  className="flex items-center justify-between p-4 rounded-xl transition-all cursor-pointer bg-[#0f1c1c]/50 hover:bg-[#0f1c1c] border border-transparent hover:border-[#2a3838]"
                  onClick={() => router.push("/admin/blogs")}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-white truncate text-sm">{blog.title}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(blog.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-br from-[#1a2828] to-[#0f1c1c] rounded-2xl border border-[#2a3838] p-6">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => router.push("/admin/episodes")}
            className="p-4 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 transition-all text-left hover:scale-105"
          >
            <FileAudio size={20} className="text-blue-400 mb-2" />
            <div className="font-semibold text-white">Manage Episodes</div>
            <div className="text-sm text-gray-400">Edit, create, or delete episodes</div>
          </button>
          <button
            onClick={() => router.push("/admin/blogs")}
            className="p-4 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 transition-all text-left hover:scale-105"
          >
            <BookOpen size={20} className="text-purple-400 mb-2" />
            <div className="font-semibold text-white">Manage Blogs</div>
            <div className="text-sm text-gray-400">Create and manage blog posts</div>
          </button>
        </div>
      </div>
    </div>
  );
}