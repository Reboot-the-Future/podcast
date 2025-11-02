// app/admin/blogs/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Save, AlertCircle, CheckCircle, Link as LinkIcon, RefreshCw, Edit2, Eye } from "lucide-react";
import { useRouter } from "next/navigation";

interface Blog {
  id?: number;
  title: string;
  excerpt: string;
  date: string;
  link: string;
  tags: string[];
}

type ViewMode = "view" | "edit";

export default function AdminBlogsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("view");

  const [blogs, setBlogs] = useState<Blog[]>([
    { title: "", excerpt: "", date: "", link: "", tags: [] },
    { title: "", excerpt: "", date: "", link: "", tags: [] },
    { title: "", excerpt: "", date: "", link: "", tags: [] },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string; details?: string[] } | null>(null);
  // Separate state for tags input to preserve user-typed separators (commas)
  const [tagsInput, setTagsInput] = useState<string[]>(["", "", ""]);

  // Set document title
  useEffect(() => {
    document.title = "Blogs › Reboot Admin";
  }, []);

  // Check authentication on mount
  useEffect(() => {
  const storedToken = sessionStorage.getItem("admin_token");
    if (!storedToken) {
      router.push("/admin/login");
      return;
    }
    setToken(storedToken);
  }, [router]);

  useEffect(() => {
    if (token) {
      fetchBlogs();
    }
  }, [token]);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const res = await fetch("/api/blogs?limit=3");

      if (!res.ok) throw new Error("Failed to fetch blogs");

      const data = await res.json();
      const fetchedBlogs = data.blogs || [];

      const blogSlots: Blog[] = [
        { title: "", excerpt: "", date: "", link: "", tags: [] },
        { title: "", excerpt: "", date: "", link: "", tags: [] },
        { title: "", excerpt: "", date: "", link: "", tags: [] },
      ];

      fetchedBlogs.slice(0, 3).forEach((blog: any, index: number) => {
        blogSlots[index] = {
          id: blog.id,
          title: blog.title || "",
          excerpt: blog.excerpt || "",
          date: blog.date ? formatDateForInput(blog.date) : "",
          link: blog.link || "",
          tags: Array.isArray(blog.tags) ? blog.tags : [],
        };
      });

      setBlogs(blogSlots);
      // Initialize tags input from fetched blogs
      const tagsInputSlots = blogSlots.map(blog => blog.tags.join(", "));
      setTagsInput(tagsInputSlots);
      // If all blogs are empty, default to edit mode so user can add content
      const allEmpty = blogSlots.every(isBlogEmpty);
      setViewMode(allEmpty ? "edit" : "view");
    } catch (error) {
      console.error("Error fetching blogs:", error);
      setMessage({
        type: "error",
        text: "Failed to load blogs",
        details: [error instanceof Error ? error.message : "Unknown error"],
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDateForInput = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return "";
    }
  };

  const formatDateForDisplay = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const handleChange = (index: number, field: keyof Blog, value: string | string[]) => {
    setBlogs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    if (message) setMessage(null);
  };

  const isBlogEmpty = (blog: Blog): boolean => {
    return !blog.title.trim() && !blog.date.trim() && !blog.link.trim() && blog.tags.length === 0;
  };

  const isBlogPartiallyFilled = (blog: Blog): boolean => {
    const hasTitle = blog.title.trim().length > 0;
    const hasDate = blog.date.trim().length > 0;
    const filledFieldsCount = [hasTitle, hasDate].filter(Boolean).length;
    return filledFieldsCount > 0 && filledFieldsCount < 2;
  };

  const validateBlogs = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    for (let i = 0; i < blogs.length; i++) {
      const blog = blogs[i];
      if (isBlogEmpty(blog)) continue;
      if (isBlogPartiallyFilled(blog)) {
        const missing: string[] = [];
        if (!blog.title.trim()) missing.push("Title");
        if (!blog.date.trim()) missing.push("Date");
        errors.push(`Blog ${i + 1}: ${missing.join(", ")} required`);
        continue;
      }
      if (blog.title.length > 500) errors.push(`Blog ${i + 1}: Title too long (max 500 characters)`);
      if (blog.link.trim()) {
        try {
          new URL(blog.link.trim());
        } catch {
          errors.push(`Blog ${i + 1}: Invalid URL format`);
        }
      }
    }
    return { valid: errors.length === 0, errors };
  };

  const saveBlogs = async () => {
    if (!token) {
      setMessage({ type: "error", text: "Authentication required. Please log in again." });
      router.push("/admin/login");
      return;
    }

    const validation = validateBlogs();
    if (!validation.valid) {
      setMessage({ type: "error", text: "Please fix the following errors:", details: validation.errors });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      
      // Ensure excerpt is never undefined/null for database
      const blogsToSave = blogs.map(blog => ({
        ...blog,
        excerpt: blog.excerpt || "" // Always provide empty string if excerpt is empty
      }));
      
      const res = await fetch("/api/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ blogs: blogsToSave }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          sessionStorage.removeItem("admin_token");
          router.push("/admin/login");
          return;
        }
        throw new Error(data.error || "Failed to save blogs");
      }

      setMessage({ type: "success", text: "✓ Blogs saved successfully!" });
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await fetchBlogs();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error saving blogs:", error);
      const errorData = error instanceof Error ? error.message : "Unknown error";
      setMessage({ type: "error", text: "Failed to save blogs", details: [errorData] });
    } finally {
      setSaving(false);
    }
  };

  // Removed per request: logout is handled globally in Admin layout

  if (!token) {
    return (
      <div className="p-6 md:p-10 flex items-center justify-center min-h-screen bg-[#0f1c1c]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ffa9fc] mx-auto mb-4"></div>
          <p className="text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 md:p-10 flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0f1c1c] to-[#1a2828]">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ffa9fc] mx-auto"></div>
            <div className="absolute inset-0 animate-pulse rounded-full h-12 w-12 border border-[#ffa9fc]/30 mx-auto"></div>
          </div>
          <p className="text-gray-400 font-medium mb-2">Loading blogs...</p>
          <div className="flex justify-center space-x-1">
            <div className="w-2 h-2 bg-[#ffa9fc] rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-[#ffa9fc] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-[#ffa9fc] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1c1c] p-6 md:p-10">
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="border-b border-[#2a3838] pb-6">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white">Homepage Blogs</h1>
              <p className="text-[#efe8e6]/70 mt-2">Manage up to 3 blog posts displayed on the homepage sidebar</p>
            </div>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`p-4 rounded-xl border animate-in fade-in ${
              message.type === "success"
                ? "bg-[#00ffaa]/10 border-[#00ffaa]/30"
                : "bg-red-500/10 border-red-500/30"
            }`}
          >
            <div className="flex items-start gap-3">
              {message.type === "success" ? (
                <CheckCircle size={20} className="flex-shrink-0 text-[#00ffaa] mt-0.5" />
              ) : (
                <AlertCircle size={20} className="flex-shrink-0 text-red-400 mt-0.5" />
              )}
              <div className="flex-1">
                <p
                  className={`text-sm md:text-base font-semibold ${
                    message.type === "success" ? "text-[#00ffaa]" : "text-red-400"
                  }`}
                >
                  {message.text}
                </p>
                {message.details && message.details.length > 0 && (
                  <ul
                    className={`mt-2 space-y-1 text-sm ${
                      message.type === "success" ? "text-[#00ffaa]/80" : "text-red-400/80"
                    }`}
                  >
                    {message.details.map((detail, idx) => (
                      <li key={idx}>• {detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* View/Edit Toggle */}
        <div className="flex gap-3">
          <button
            onClick={() => setViewMode("view")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all ${
              viewMode === "view"
                ? "bg-[#00ffaa] text-[#0f1c1c] shadow-lg shadow-[#00ffaa]/30"
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
          >
            <Eye size={18} />
            View
          </button>
          <button
            onClick={() => setViewMode("edit")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all ${
              viewMode === "edit"
                ? "bg-[#ffa9fc] text-[#0f1c1c] shadow-lg shadow-[#ffa9fc]/30"
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
          >
            <Edit2 size={18} />
            Edit
          </button>
        </div>

        {/* VIEW MODE */}
        {viewMode === "view" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {blogs.map(
                (blog, index) =>
                  !isBlogEmpty(blog) && (
                    <div
                      key={index}
                      className="bg-gradient-to-br from-[#1a2828] to-[#0f1c1c] p-6 rounded-3xl border border-[#2a3838] hover:border-[#ffa9fc]/30 transition-all"
                    >
                      {blog.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {blog.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs text-[#ffa9fc] bg-[#ffa9fc]/10 px-2 py-1 rounded-full border border-[#ffa9fc]/20"
                            >
                              {tag}
                            </span>
                          ))}
                          {blog.tags.length > 3 && (
                            <span className="text-xs text-gray-400">+{blog.tags.length - 3}</span>
                          )}
                        </div>
                      )}

                      <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{blog.title}</h3>

                      {blog.excerpt && (
                        <p className="text-sm text-gray-300 mb-3 line-clamp-3">{blog.excerpt}</p>
                      )}

                      <div className="text-xs text-gray-400 mb-3">{formatDateForDisplay(blog.date)}</div>

                      {blog.link && (
                        <a
                          href={blog.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#00ffaa] hover:text-[#00ffaa]/80 transition-colors flex items-center gap-1"
                        >
                          <LinkIcon size={12} />
                          Visit
                        </a>
                      )}
                    </div>
                  )
              )}
            </div>
          </div>
        )}

        {/* EDIT MODE */}
        {viewMode === "edit" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {blogs.map((blog, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-[#1a2828] to-[#0f1c1c] p-6 rounded-3xl border border-[#2a3838] shadow-lg hover:shadow-[#ffa9fc]/40 transition-all hover:border-[#ffa9fc]/50"
                >
                  <h2 className="text-xl font-bold text-white mb-4">Blog {index + 1}</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#ffa9fc] mb-2">Title</label>
                      <input
                        type="text"
                        value={blog.title}
                        onChange={(e) => handleChange(index, "title", e.target.value)}
                        placeholder="Blog title"
                        maxLength={500}
                        className="w-full px-4 py-3 bg-[#0f1c1c] border border-[#2a3838] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#ffa9fc] focus:ring-2 focus:ring-[#ffa9fc]/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#00ffaa] mb-2">Excerpt (Optional)</label>
                      <textarea
                        value={blog.excerpt}
                        onChange={(e) => handleChange(index, "excerpt", e.target.value)}
                        placeholder="Brief description or summary of the blog post"
                        maxLength={2000}
                        rows={3}
                        className="w-full px-4 py-3 bg-[#0f1c1c] border border-[#2a3838] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#00ffaa] focus:ring-2 focus:ring-[#00ffaa]/20 transition-all resize-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">{blog.excerpt.length}/2000 characters</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#ffa9fc] mb-2">Date</label>
                      <input
                        type="date"
                        value={blog.date}
                        onChange={(e) => handleChange(index, "date", e.target.value)}
                        className="w-full px-4 py-3 bg-[#0f1c1c] border border-[#2a3838] rounded-xl text-white focus:outline-none focus:border-[#ffa9fc] focus:ring-2 focus:ring-[#ffa9fc]/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#00ffaa] mb-2 flex items-center gap-2">
                        <LinkIcon size={16} />
                        Link (Optional)
                      </label>
                      <input
                        type="url"
                        value={blog.link}
                        onChange={(e) => handleChange(index, "link", e.target.value)}
                        placeholder="https://example.com"
                        className="w-full px-4 py-3 bg-[#0f1c1c] border border-[#2a3838] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#00ffaa] focus:ring-2 focus:ring-[#00ffaa]/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#00ffaa] mb-2">Tags</label>
                      <input
                        type="text"
                        value={tagsInput[index]}
                        onChange={(e) => {
                          const raw = e.target.value;
                          // Update the tags input state to preserve what user typed
                          const newTagsInput = [...tagsInput];
                          newTagsInput[index] = raw;
                          setTagsInput(newTagsInput);
                          
                          // Split on common separators: comma, Arabic comma،, Chinese comma，, Japanese 、, semicolon, and newlines
                          const parts = raw
                            .split(/[\,\u060C;，、;\n]+/)
                            .map(t => t.trim())
                            .filter(Boolean)
                            .slice(0, 10); // cap number of tags
                          
                          // Deduplicate while preserving order and cap tag length
                          const seen = new Set<string>();
                          const tags = parts
                            .map(t => t.slice(0, 50))
                            .filter(t => {
                              const lower = t.toLowerCase();
                              if (seen.has(lower)) return false;
                              seen.add(lower);
                              return true;
                            });
                          
                          handleChange(index, "tags", tags);
                        }}
                        placeholder="Leadership, Innovation"
                        className="w-full px-4 py-3 bg-[#0f1c1c] border border-[#2a3838] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#00ffaa] focus:ring-2 focus:ring-[#00ffaa]/20 transition-all"
                      />
                      <p className="text-xs text-gray-400 mt-2">
                        Separate tags with commas (, ، ， 、) or semicolons
                      </p>
                      {blog.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {blog.tags.map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="text-xs px-2 py-1 rounded-full bg-[#00ffaa]/20 text-[#00ffaa] border border-[#00ffaa]/30"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4 pt-6 border-t border-[#2a3838]">
              <button
                onClick={saveBlogs}
                disabled={saving}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-[#ffa9fc] hover:bg-brand-primary-hover text-[#0f1c1c] font-bold rounded-2xl shadow-lg disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
              >
                {saving ? (
                  <>
                    <RefreshCw size={20} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Save All Blogs
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
