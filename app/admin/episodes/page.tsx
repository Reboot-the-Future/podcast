"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Edit, Trash2, X, Search, Filter, Star, EyeOff, ExternalLink, Info, Settings, Eye,
  CheckCircle, AlertCircle, AlertTriangle, InfoIcon,
} from "lucide-react";
import MarkdownContent from "@/components/MarkdownContent";

interface Episode {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  duration: number;
  date_published: string;
  tags: string[];
  status: string;
  buzzsprout_episode_id?: string;
  spotify_url?: string;
  apple_url?: string;
}

interface Alert {
  type: "success" | "error" | "warning" | "info";
  message: string;
}

interface ComingSoon {
  id: number;
  title: string;
  description?: string;
  is_visible: boolean;
}

export default function AdminEpisodes() {
  const router = useRouter();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [filteredEpisodes, setFilteredEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [comingSoon, setComingSoon] = useState<ComingSoon | null>(null);
  const [showComingSoonForm, setShowComingSoonForm] = useState(false);
  const [comingSoonForm, setComingSoonForm] = useState({
    title: "",
    description: "",
    is_visible: false,
  });
  const comingSoonDescRef = useRef<HTMLTextAreaElement | null>(null);
  const [csShowPreview, setCsShowPreview] = useState(false);
  const [csPreviewTheme, setCsPreviewTheme] = useState<'light' | 'dark'>('light');
  // Separate input state to allow temporary empty/partial input (fixes backspace issue)
  const [durationInput, setDurationInput] = useState<string>("");
  // Dirty tracking for unsaved changes in the episode form
  const [isDirty, setIsDirty] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const excerptRef = useRef<HTMLTextAreaElement | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light');
  // Separate state for tags input so we preserve user-typed separators (commas)
  const [tagsInput, setTagsInput] = useState<string>("");

  const markDirty = () => setIsDirty(true);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmLabel?: string;
    confirmTone?: "danger" | "primary";
  } | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    duration: 0,
    date_published: new Date().toISOString().split("T")[0],
    tags: [] as string[],
    status: "published",
    buzzsprout_episode_id: "",
    spotify_url: "",
    apple_url: "",
  });

  // Markdown toolbar helpers for the Full Description textarea
  const applyMarkdown = (action: 'bold' | 'italic' | 'link') => {
    const el = excerptRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const value = formData.excerpt || '';
    const selected = value.slice(start, end);

    let nextValue = value;
    let caretPos = end;

    switch (action) {
      case 'bold': {
        const wrapped = `**${selected || 'bold text'}**`;
        nextValue = value.slice(0, start) + wrapped + value.slice(end);
        caretPos = start + (selected ? wrapped.length : 2);
        break;
      }
      case 'italic': {
        const wrapped = `*${selected || 'italic text'}*`;
        nextValue = value.slice(0, start) + wrapped + value.slice(end);
        caretPos = start + (selected ? wrapped.length : 1);
        break;
      }
      case 'link': {
        const text = selected || 'link text';
        const wrapped = `[${text}](https://)`;
        nextValue = value.slice(0, start) + wrapped + value.slice(end);
        // place caret inside the URL to edit
        caretPos = start + wrapped.indexOf('https://');
        break;
      }
      
    }

    setFormData({ ...formData, excerpt: nextValue });
    markDirty();

    requestAnimationFrame(() => {
      if (excerptRef.current) {
        excerptRef.current.focus();
        excerptRef.current.selectionStart = excerptRef.current.selectionEnd = caretPos;
      }
    });
  };

  useEffect(() => {
    document.title = "Episodes › Reboot Admin";
  }, []);

  useEffect(() => {
    fetchEpisodes();
    fetchComingSoon();
  }, []);

  useEffect(() => {
    filterEpisodes();
  }, [episodes, searchTerm, statusFilter]);

  const fetchEpisodes = async () => {
    try {
  const token = sessionStorage.getItem("admin_token");
      if (!token) {
        showAlert("error", "No authentication token found. Please log in again.");
        router.push("/admin/login");
        return;
      }

      const res = await fetch("/api/admin/episodes?limit=100", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.status === 401) {
        showAlert("error", "Session expired. Please log in again.");
  sessionStorage.removeItem("admin_token");
        router.push("/admin/login");
        return;
      }
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        const errorMsg = errorData.details || errorData.error || `Server error: ${res.status}`;
        throw new Error(errorMsg);
      }
      
      const data = await res.json();

      const processedEpisodes = (data.episodes || []).map((episode: any) => {
        let tags = [];
        try {
          if (typeof episode.tags === "string") {
            tags = JSON.parse(episode.tags);
          } else if (Array.isArray(episode.tags)) {
            tags = episode.tags;
          }
        } catch (error) {
          tags = [];
        }
        return {
          ...episode,
          tags,
          buzzsprout_episode_id: episode.buzzsprout_episode_id || "",
        };
      });

      setEpisodes(processedEpisodes);
    } catch (error) {
      console.error("Error fetching episodes:", error);
      showAlert("error", error instanceof Error ? error.message : "Failed to load episodes.");
    } finally {
      setLoading(false);
    }
  };

  const filterEpisodes = () => {
    let filtered = [...episodes];
    if (searchTerm) {
      filtered = filtered.filter(
        (ep) =>
          ep.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ep.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((ep) => ep.status === statusFilter);
    }
    setFilteredEpisodes(filtered);
  };

  const showAlert = (type: Alert["type"], message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      duration: 0,
      date_published: new Date().toISOString().split("T")[0],
      tags: [],
      status: "published",
      buzzsprout_episode_id: "",
      spotify_url: "",
      apple_url: "",
    });
    setTagsInput("");
    setDurationInput("");
    setEditingEpisode(null);
    setCurrentStep(1);
    setIsDirty(false);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.slug || !formData.excerpt) {
      showAlert("error", "Please fill in all required fields");
      return;
    }

    try {
  const token = sessionStorage.getItem("admin_token");
      const url = editingEpisode
        ? `/api/admin/episodes/${editingEpisode.id}`
        : "/api/admin/episodes";
      const method = editingEpisode ? "PUT" : "POST";

      // Parse minutes from input (allow empty, commas, and decimals)
      const minutes = (() => {
        const cleaned = (durationInput || "").replace(",", ".");
        const n = parseFloat(cleaned);
        return Number.isFinite(n) && n >= 0 ? n : 0;
      })();

      const payload = {
        title: formData.title,
        slug: formData.slug,
        excerpt: formData.excerpt,
        content: formData.content,
        duration: Math.round(minutes * 60),
        date_published: formData.date_published,
        tags: formData.tags,
        status: formData.status,
        buzzsprout_episode_id: formData.buzzsprout_episode_id || "",
        spotify_url: formData.spotify_url || "",
        apple_url: formData.apple_url || "",
      };

      console.log("=== SUBMITTING TO ADMIN API ===");
      console.log("URL:", url);
      console.log("Method:", method);
      console.log("Payload:", payload);

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log("Response Status:", res.status);

      const responseText = await res.text();
      console.log("Raw Response:", responseText.substring(0, 500));

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        throw new Error(`Server error (${res.status}). The API returned HTML. Check your API endpoint exists.`);
      }

      if (!res.ok) {
        throw new Error(responseData.error || responseData.message || `HTTP ${res.status}`);
      }

      await fetchEpisodes();
      resetForm();
      setIsDirty(false);
      setShowForm(false);
      showAlert("success", `Episode "${formData.title}" saved successfully!`);
    } catch (error: any) {
      console.error("=== SAVE ERROR ===");
      console.error(error);
      showAlert("error", error.message || "Failed to save episode. Check console for details.");
    }
  };

  const handleDelete = async (episode: Episode) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Episode",
      message: `Are you sure you want to delete "${episode.title}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      confirmTone: "danger",
      onConfirm: async () => {
        try {
          const token = sessionStorage.getItem("admin_token");
          const res = await fetch(`/api/admin/episodes/${episode.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error("Delete failed");
          await fetchEpisodes();
          showAlert("success", `Episode "${episode.title}" deleted.`);
        } catch {
          showAlert("error", "Failed to delete episode.");
        } finally {
          setConfirmDialog(null);
        }
      }
    });
  };

  const startEdit = (episode: Episode) => {
    setEditingEpisode(episode);
    setCurrentStep(1); // Always start from step 1 when opening an episode
    setFormData({
      title: episode.title,
      slug: episode.slug,
      excerpt: episode.excerpt,
      content: episode.content || "",
      duration: Math.round(episode.duration / 60),
      date_published: episode.date_published.split("T")[0],
      tags: episode.tags,
      status: episode.status,
      buzzsprout_episode_id: episode.buzzsprout_episode_id || "",
      spotify_url: episode.spotify_url || "",
      apple_url: episode.apple_url || "",
    });
    setTagsInput((episode.tags || []).join(", "));
    // Pre-fill minutes as a string so user can edit freely
    setDurationInput(String(Math.round(episode.duration / 60)));
    setIsDirty(false);
    setShowForm(true);
  };
  const attemptCloseForm = () => {
    if (isDirty) {
      setConfirmDialog({
        isOpen: true,
        title: "Discard changes?",
        message: "You have unsaved changes. Do you want to discard them?",
        confirmLabel: "Discard",
        confirmTone: "primary",
        onConfirm: () => {
          setIsDirty(false);
          setShowForm(false);
          setConfirmDialog(null);
        },
      });
      return;
    }
    setShowForm(false);
  };

  // Focus first input and keyboard shortcuts when modal opens
  useEffect(() => {
    if (showForm) {
      // Defer focus to after render
      setTimeout(() => titleInputRef.current?.focus(), 0);
    }
  }, [showForm]);

  // When the episode form opens, start with preview closed and light theme
  useEffect(() => {
    if (showForm) {
      setShowPreview(false);
      setPreviewTheme('light');
    }
  }, [showForm]);

  // When the Coming Soon form opens, start with preview closed and light theme
  useEffect(() => {
    if (showComingSoonForm) {
      setCsShowPreview(false);
      setCsPreviewTheme('light');
    }
  }, [showComingSoonForm]);

  // Lock background scroll when any modal or confirm dialog is open
  useEffect(() => {
    const anyOpen = showForm || showComingSoonForm || !!confirmDialog?.isOpen;
    if (anyOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [showForm, showComingSoonForm, confirmDialog?.isOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!showForm) return;
      const target = e.target as HTMLElement | null;
      const isTextArea = target?.tagName === 'TEXTAREA';
      if (e.key === 'Escape') {
        e.preventDefault();
        attemptCloseForm();
      } else if (e.key === 'Enter' && !e.shiftKey && !isTextArea) {
        e.preventDefault();
        if (currentStep < 2) {
          setCurrentStep(currentStep + 1);
        } else {
          handleSubmit();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showForm, currentStep, isDirty, formData, durationInput]);

  // Warn before closing tab if form is dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (showForm && isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [showForm, isDirty]);

  // Slug duplicate check (exclude self when editing)
  const isSlugDuplicate = formData.slug.trim().length > 0 && episodes.some(
    (ep) => ep.slug === formData.slug.trim() && (!editingEpisode || ep.id !== editingEpisode.id)
  );

  const canProceedStep1 = !!formData.title.trim() && !!formData.slug.trim() && !!formData.excerpt.trim() && !isSlugDuplicate;

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const fetchComingSoon = async () => {
    try {
  const token = sessionStorage.getItem("admin_token");
      const res = await fetch("/api/admin/coming-soon", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setComingSoon(data.comingSoon);
        if (data.comingSoon) {
          setComingSoonForm({
            title: data.comingSoon.title,
            description: data.comingSoon.description || "",
            is_visible: data.comingSoon.is_visible,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching coming soon:", error);
    }
  };

  const handleComingSoonSubmit = async () => {
    if (!comingSoonForm.title.trim()) {
      showAlert("error", "Title is required");
      return;
    }

    try {
  const token = sessionStorage.getItem("admin_token");
      const res = await fetch("/api/admin/coming-soon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(comingSoonForm),
      });

      if (!res.ok) throw new Error("Failed to save coming soon section");

      await fetchComingSoon();
      setShowComingSoonForm(false);
      showAlert("success", "Coming Soon section saved successfully!");
    } catch (error: any) {
      showAlert("error", error.message || "Failed to save coming soon section");
    }
  };

  const toggleComingSoonVisibility = async () => {
    if (!comingSoon) return;

    try {
  const token = sessionStorage.getItem("admin_token");
      const res = await fetch("/api/admin/coming-soon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...comingSoonForm,
          is_visible: !comingSoon.is_visible,
        }),
      });

      if (!res.ok) throw new Error("Failed to update visibility");

      await fetchComingSoon();
      showAlert("success", `Coming Soon section ${!comingSoon.is_visible ? "shown" : "hidden"}`);
    } catch (error: any) {
      showAlert("error", error.message || "Failed to update visibility");
    }
  };

  const handleDeleteComingSoon = async () => {
    if (!comingSoon) return;

    setConfirmDialog({
      isOpen: true,
      title: "Delete Coming Soon Section",
      message: `Are you sure you want to delete "${comingSoon.title}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      confirmTone: "danger",
      onConfirm: async () => {
        try {
          const token = sessionStorage.getItem("admin_token");
          const res = await fetch("/api/admin/coming-soon", {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!res.ok) throw new Error("Failed to delete coming soon section");

          // Reset form after deletion
          setComingSoonForm({
            title: "",
            description: "",
            is_visible: false,
          });

          await fetchComingSoon();
          showAlert("success", "Coming Soon section deleted successfully!");
        } catch (error: any) {
          showAlert("error", error.message || "Failed to delete coming soon section");
        } finally {
          setConfirmDialog(null);
        }
      }
    });
  };

  // Markdown toolbar for Coming Soon description
  const applyCsMarkdown = (action: 'bold' | 'italic' | 'link') => {
    const el = comingSoonDescRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const value = comingSoonForm.description || '';
    const selected = value.slice(start, end);

    let nextValue = value;
    let caretPos = end;

    switch (action) {
      case 'bold': {
        const wrapped = `**${selected || 'bold text'}**`;
        nextValue = value.slice(0, start) + wrapped + value.slice(end);
        caretPos = start + (selected ? wrapped.length : 2);
        break;
      }
      case 'italic': {
        const wrapped = `*${selected || 'italic text'}*`;
        nextValue = value.slice(0, start) + wrapped + value.slice(end);
        caretPos = start + (selected ? wrapped.length : 1);
        break;
      }
      case 'link': {
        const text = selected || 'link text';
        const wrapped = `[${text}](https://)`;
        nextValue = value.slice(0, start) + wrapped + value.slice(end);
        caretPos = start + wrapped.indexOf('https://');
        break;
      }
    }

    setComingSoonForm({ ...comingSoonForm, description: nextValue });

    requestAnimationFrame(() => {
      if (comingSoonDescRef.current) {
        comingSoonDescRef.current.focus();
        comingSoonDescRef.current.selectionStart = comingSoonDescRef.current.selectionEnd = caretPos;
      }
    });
  };

  const AlertComponent = ({ alert }: { alert: Alert }) => {
    const config = {
      success: {
        bg: 'bg-green-500/20',
        border: 'border-green-500/50',
        text: 'text-green-400',
        icon: CheckCircle
      },
      error: {
        bg: 'bg-red-500/20',
        border: 'border-red-500/50',
        text: 'text-red-400',
        icon: AlertCircle
      },
      warning: {
        bg: 'bg-yellow-500/20',
        border: 'border-yellow-500/50',
        text: 'text-yellow-400',
        icon: AlertTriangle
      },
      info: {
        bg: 'bg-blue-500/20',
        border: 'border-blue-500/50',
        text: 'text-blue-400',
        icon: InfoIcon
      },
    };

    const { bg, border, text, icon: Icon } = config[alert.type];

    return (
      <div className={`fixed top-4 right-4 z-[100] ${bg} ${border} border rounded-xl p-4 shadow-2xl min-w-[300px] max-w-md animate-in slide-in-from-top-5 fade-in duration-300`}>
        <div className="flex items-start gap-3">
          <Icon className={`${text} flex-shrink-0 mt-0.5`} size={20} />
          <p className={`${text} font-semibold text-sm flex-1`}>{alert.message}</p>
        </div>
      </div>
    );
  };

  const ConfirmDialog = () => {
    if (!confirmDialog?.isOpen) return null;

    return (
  <div className="fixed inset-0 bg-[#0F1C1C]/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-gradient-to-br from-[#1a2828] to-[#0f1c1c] rounded-2xl border border-[#2a3838] shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
          <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-500/20 rounded-xl">
                <AlertTriangle size={24} className="text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-1">{confirmDialog.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{confirmDialog.message}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 px-4 py-3 bg-[#2a3838] hover:bg-[#3a4848] text-white rounded-xl font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                }}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg ${
                  confirmDialog.confirmTone === 'danger'
                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-red-500/30'
                    : 'bg-[#ffa9fc] text-[#0f1c1c] hover:brightness-110'
                }`}
              >
                {confirmDialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-[#0f1c1c] to-[#1a2828]">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-[#ffa9fc]/30 border-t-[#ffa9fc] rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 animate-pulse rounded-full w-16 h-16 border border-[#ffa9fc]/20 mx-auto"></div>
          </div>
          <p className="text-gray-400 font-medium mb-2">Loading episodes...</p>
          <div className="flex justify-center space-x-1">
            <div className="w-2 h-2 bg-[#ffa9fc] rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-[#ffa9fc] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-[#ffa9fc] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  const sortedEpisodes = [...filteredEpisodes].sort(
    (a, b) =>
      new Date(b.date_published).getTime() -
      new Date(a.date_published).getTime()
  );

  return (
    <div className="p-4 md:p-8 space-y-6 pb-20">
      {alert && <AlertComponent alert={alert} />}
      <ConfirmDialog />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Episodes</h1>
          <p className="text-gray-400 mt-1">{episodes.length} total</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-6 py-3 bg-[#ffa9fc] hover:bg-brand-primary-hover text-[#0f1c1c] rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-105 shadow-lg focus:outline-none focus:ring-2 focus:ring-[#ffa9fc] focus:ring-offset-2"
          aria-label="Create new episode"
        >
          <Plus size={20} />
          New Episode
        </button>
      </div>

      {/* Coming Soon Section */}
      <div className="bg-gradient-to-br from-[#1a2828] to-[#0f1c1c] rounded-2xl border border-[#2a3838] p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings size={20} />
              Coming Soon Section
            </h2>
            <p className="text-gray-400 text-sm">
              Manage the "Coming Soon" section displayed on the homepage
            </p>
          </div>
          <div className="flex gap-2">
            {comingSoon && (
              <button
                onClick={toggleComingSoonVisibility}
                className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                  comingSoon.is_visible
                    ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                    : "bg-gray-500/20 text-gray-400 border border-gray-500/30 hover:bg-gray-500/30"
                }`}
              >
                <Eye size={16} />
                {comingSoon.is_visible ? "Visible" : "Hidden"}
              </button>
            )}
            <button
              onClick={() => setShowComingSoonForm(true)}
              className="px-4 py-2 bg-[#ffa9fc]/20 text-[#ffa9fc] border border-[#ffa9fc]/30 rounded-xl font-semibold hover:bg-[#ffa9fc]/30 transition-all"
            >
              {comingSoon ? "Edit" : "Create"}
            </button>
            {comingSoon && (
              <button
                onClick={handleDeleteComingSoon}
                className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-semibold hover:bg-red-500/30 transition-all flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete
              </button>
            )}
          </div>
        </div>

        {comingSoon ? (
          <div className="bg-[#0f1c1c] rounded-xl p-4 border border-[#2a3838]">
            <h3 className="text-lg font-semibold text-white mb-2">{comingSoon.title}</h3>
            {comingSoon.description && (
              <div className="text-gray-400 text-sm mb-3">
                <MarkdownContent className="text-gray-400 text-sm" content={comingSoon.description} isDark={true} />
              </div>
            )}
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-2 py-1 rounded-full ${
                comingSoon.is_visible 
                  ? "bg-green-500/20 text-green-400" 
                  : "bg-gray-500/20 text-gray-400"
              }`}>
                {comingSoon.is_visible ? "Visible on homepage" : "Hidden from homepage"}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Settings size={48} className="mx-auto mb-4 opacity-50" />
            <p>No Coming Soon section configured</p>
            <p className="text-sm">Create one to show on the homepage</p>
          </div>
        )}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search episodes..."
            className="w-full pl-12 pr-4 py-3 bg-[#1a2828] border border-[#2a3838] rounded-xl text-white focus:outline-none focus:border-[#ffa9fc]"
          />
        </div>
        <div className="relative">
          <Filter
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-48 pl-12 pr-4 py-3 bg-[#1a2828] border border-[#2a3838] rounded-xl text-white appearance-none focus:outline-none focus:border-[#ffa9fc] [color-scheme:dark]"
          >
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-[#0F1C1C]/90 backdrop-blur-sm flex items-start md:items-center justify-center z-50 p-4 pt-14 md:pt-8 overflow-y-auto">
          <div className="bg-gradient-to-br from-[#1a2828] to-[#0f1c1c] rounded-3xl p-8 max-w-3xl w-full border border-[#ffa9fc]/20 shadow-2xl my-8 max-h-[85vh] overflow-y-auto themed-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#ffa9fc]">
                {editingEpisode ? "Edit Episode" : "New Episode"}
              </h2>
              <button
                onClick={attemptCloseForm}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {[1, 2].map((step) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${currentStep >= step
                      ? "bg-[#ffa9fc] text-[#0f1c1c]"
                      : "bg-[#2a3838] text-gray-400"
                      }`}
                  >
                    {step}
                  </div>
                  {step < 2 && (
                    <div
                      className={`w-12 h-1 mx-2 rounded-full ${currentStep > step ? "bg-[#ffa9fc]" : "bg-[#2a3838]"
                        }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">
                    Episode Title *
                  </label>
                  <input
                    type="text"
                    ref={titleInputRef}
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        title: e.target.value,
                        slug: generateSlug(e.target.value),
                      });
                      markDirty();
                    }}
                    placeholder="Enter episode title"
                    className="w-full px-4 py-3 bg-[#0f1c1c] border border-[#2a3838] rounded-xl text-white focus:outline-none focus:border-[#ffa9fc]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">
                    Slug (auto-generated from title)
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    readOnly
                    placeholder="episode-slug"
                    className="w-full px-4 py-3 bg-[#0f1c1c]/50 border border-[#2a3838] rounded-xl text-gray-400 cursor-not-allowed"
                  />
                  {isSlugDuplicate && (
                    <p className="text-xs text-red-400 mt-2">Slug already exists. Please choose a unique slug.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">
                    Full Description *
                  </label>
                  {/* Markdown Toolbar */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => applyMarkdown('bold')}
                      className="px-2.5 py-1.5 text-xs bg-[#1a2828] border border-[#2a3838] rounded-lg text-white hover:border-[#ffa9fc]"
                      title="Bold (wrap selection with ** **)"
                    >
                      Bold
                    </button>
                    <button
                      type="button"
                      onClick={() => applyMarkdown('italic')}
                      className="px-2.5 py-1.5 text-xs bg-[#1a2828] border border-[#2a3838] rounded-lg text-white hover:border-[#ffa9fc]"
                      title="Italic (wrap selection with * *)"
                    >
                      Italic
                    </button>
                    <button
                      type="button"
                      onClick={() => applyMarkdown('link')}
                      className="px-2.5 py-1.5 text-xs bg-[#1a2828] border border-[#2a3838] rounded-lg text-white hover:border-[#ffa9fc]"
                      title="Insert link [text](https://)"
                    >
                      Link
                    </button>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={() => setShowPreview((v) => !v)}
                      className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${showPreview ? 'bg-[#ffa9fc] text-[#0f1c1c] border-[#ffa9fc]' : 'bg-[#1a2828] border-[#2a3838] text-white hover:border-[#ffa9fc]'}`}
                      title="Toggle preview"
                    >
                      {showPreview ? 'Hide Preview' : 'Show Preview'}
                    </button>
                    {showPreview && (
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          type="button"
                          onClick={() => setPreviewTheme('light')}
                          className={`px-2 py-1 text-xs rounded-lg border transition-colors ${previewTheme === 'light' ? 'bg-white text-[#0f1c1c] border-gray-300' : 'bg-[#1a2828] text-white border-[#2a3838] hover:border-[#ffa9fc]'}`}
                          title="Preview on light background"
                        >
                          Light
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewTheme('dark')}
                          className={`px-2 py-1 text-xs rounded-lg border transition-colors ${previewTheme === 'dark' ? 'bg-[#2a3838] text-white border-[#3a4848]' : 'bg-[#1a2828] text-white border-[#2a3838] hover:border-[#ffa9fc]'}`}
                          title="Preview on dark background"
                        >
                          Dark
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    Tip: select the text first, then click Bold or Italic. For Link, select the text that should become the link.
                  </p>
                  <textarea
                    ref={excerptRef}
                    value={formData.excerpt}
                    onChange={(e) => {
                      setFormData({ ...formData, excerpt: e.target.value });
                      markDirty();
                    }}
                    placeholder="Full description of the episode"
                    className="w-full px-4 py-3 h-32 bg-[#0f1c1c] border border-[#2a3838] rounded-xl text-white focus:outline-none focus:border-[#ffa9fc] resize-none"
                  />
                  {showPreview && (
                    <div className={`mt-2 p-3 rounded-lg border ${previewTheme === 'dark' ? 'bg-[#0f1c1c] border-[#2a3838]' : 'bg-white border-gray-200'}`}>
                      <p className={`text-xs font-semibold mb-2 ${previewTheme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>Preview</p>
                      <div className={`${previewTheme === 'dark' ? 'prose prose-invert' : 'prose'} max-w-none text-[15px] leading-snug`}>
                        <MarkdownContent className={`${previewTheme === 'dark' ? 'text-white' : 'text-[#0F1C1C]'}`} content={formData.excerpt} isDark={previewTheme === 'dark'} />
                      </div>
                    </div>
                  )}
                  <div className="mt-2 p-3 bg-[#0f1c1c] border border-[#2a3838] rounded-lg">
                    <p className="text-xs text-gray-400 font-semibold mb-2">💡 Formatting Tips:</p>
                    <div className="space-y-1 text-xs text-gray-500">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <span className="text-[#ffa9fc] font-mono">**bold text**</span> → <strong className="text-white">bold text</strong>
                        </div>
                        <div>
                          <span className="text-[#ffa9fc] font-mono">*italic text*</span> → <em className="text-white">italic text</em>
                        </div>
                      </div>
                      <div>
                        <span className="text-[#ffa9fc] font-mono">[link text](https://example.com)</span> → <a className="text-[#d97ac8] underline">link text</a>
                      </div>
                      <div className="pt-1 border-t border-[#2a3838] mt-2">
                        <div className="text-gray-400 mb-1">Line breaks:</div>
                        <div className="pl-2 space-y-0.5">
                          <div>• Press Enter once for a line break</div>
                          <div>• Press Enter twice for paragraph spacing</div>
                          <div>• Add multiple blank lines for extra spacing</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">
                      Duration (minutes) *
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={durationInput}
                      onChange={(e) => {
                        // Allow only digits and a single dot/comma; permit empty
                        const next = e.target.value.replace(/,/g, ".");
                        if (/^\d*(?:\.?\d*)?$/.test(next)) {
                          setDurationInput(next);
                        }
                        markDirty();
                      }}
                      className="w-full px-4 py-3 bg-[#0f1c1c] border border-[#2a3838] rounded-xl text-white focus:outline-none focus:border-[#ffa9fc]"
                      placeholder="45"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">
                      Publish Date *
                    </label>
                    <input
                      type="date"
                      value={formData.date_published}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          date_published: e.target.value,
                        });
                        markDirty();
                      }}
                      className="w-full px-4 py-3 bg-[#0f1c1c] border border-[#2a3838] rounded-xl text-white focus:outline-none focus:border-[#ffa9fc] [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Tags, Buzzsprout ID & Status */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setTagsInput(raw);
                      // Split on common separators: comma, Arabic comma،, Chinese comma，, Japanese 、, semicolon, and newlines
                      const parts = raw
                        .split(/[\,\u060C;，、;\n]+/)
                        .map(t => t.trim())
                        .filter(Boolean)
                        .slice(0, 20); // cap number of tags
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
                      setFormData({ ...formData, tags });
                      markDirty();
                    }}
                    placeholder="Technology, Leadership, Innovation"
                    className="w-full px-4 py-3 bg-[#0f1c1c] border border-[#2a3838] rounded-xl text-white focus:outline-none focus:border-[#ffa9fc]"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Separate tags with commas (, ، ， 、) or semicolons
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">
                    Buzzsprout Episode ID
                  </label>
                  <input
                    type="text"
                    value={formData.buzzsprout_episode_id}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        buzzsprout_episode_id: e.target.value,
                      });
                      markDirty();
                    }}
                    placeholder="Enter Buzzsprout episode ID"
                    className="w-full px-4 py-3 bg-[#0f1c1c] border border-[#2a3838] rounded-xl text-white focus:outline-none focus:border-[#ffa9fc]"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Optional: Link to Buzzsprout episode. Get the numeric ID from the Buzzsprout URL<br />
                    Example: https://www.buzzsprout.com/<span className="text-[#ffa9fc]">2416731</span>/episodes/<span className="text-[#00ffaa] font-semibold">16360662</span> → Enter <span className="text-[#00ffaa] font-semibold">16360662</span>
                  </p>

                  {/* Preview of the Buzzsprout episode page URL */}
                  {process.env.NEXT_PUBLIC_BUZZSPROUT_ID && formData.buzzsprout_episode_id && (
                    <div className="mt-2 text-xs text-gray-400">
                      Episode page:{" "}
                      <a
                        href={`https://www.buzzsprout.com/${process.env.NEXT_PUBLIC_BUZZSPROUT_ID}/episodes/${formData.buzzsprout_episode_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-[#ffa9fc] hover:text-brand-primary-hover"
                      >
                        https://www.buzzsprout.com/{process.env.NEXT_PUBLIC_BUZZSPROUT_ID}/episodes/{formData.buzzsprout_episode_id}
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-6 bg-[#0f1c1c] rounded-xl border border-[#2a3838]">
                  <div>
                    <label className="text-lg font-semibold text-gray-300 block mb-1">
                      Publication Status
                    </label>
                    <p className="text-sm text-gray-400">
                      Choose whether to publish immediately or save as draft
                    </p>
                  </div>
                  <select
                    value={formData.status}
                    onChange={(e) => {
                      setFormData({ ...formData, status: e.target.value });
                      markDirty();
                    }}
                    className="px-6 py-3 bg-[#1a2828] border border-[#2a3838] rounded-xl text-white font-semibold focus:outline-none focus:border-[#ffa9fc] [color-scheme:dark]"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-[#2a3838]">
              {currentStep > 1 ? (
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="px-6 py-3 bg-[#2a3838] hover:bg-[#3a4848] rounded-xl font-semibold transition-all"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {currentStep < 2 ? (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!canProceedStep1}
                  className={`px-8 py-3 bg-[#ffa9fc] hover:bg-brand-primary-hover rounded-xl font-bold text-[#0f1c1c] transition-all shadow-lg ${!canProceedStep1 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                >
                  Next Step
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSlugDuplicate || !formData.slug.trim()}
                  className={`px-8 py-3 bg-[#ffa9fc] hover:bg-brand-primary-hover rounded-xl font-bold text-[#0f1c1c] transition-all shadow-lg ${(isSlugDuplicate || !formData.slug.trim()) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                >
                  {editingEpisode ? "Update Episode" : "Create Episode"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Coming Soon Form Modal */}
      {showComingSoonForm && (
        <div className="fixed inset-0 bg-[#0F1C1C]/90 backdrop-blur-sm flex items-start md:items-center justify-center z-50 p-4 pt-14 md:pt-8 overflow-y-auto">
          <div className="bg-gradient-to-br from-[#1a2828] to-[#0f1c1c] rounded-3xl p-8 max-w-2xl w-full border border-[#ffa9fc]/20 shadow-2xl my-8 max-h-[85vh] overflow-y-auto themed-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#ffa9fc]">
                {comingSoon ? "Edit Coming Soon" : "Create Coming Soon"}
              </h2>
              <button
                onClick={() => setShowComingSoonForm(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">
                  Title *
                </label>
                <input
                  type="text"
                  value={comingSoonForm.title}
                  onChange={(e) =>
                    setComingSoonForm({ ...comingSoonForm, title: e.target.value })
                  }
                  placeholder="Enter coming soon title"
                  className="w-full px-4 py-3 bg-[#0f1c1c] border border-[#2a3838] rounded-xl text-white focus:outline-none focus:border-[#ffa9fc]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">
                  Description (Optional)
                </label>
                {/* Markdown Toolbar (Coming Soon) */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => applyCsMarkdown('bold')}
                    className="px-2.5 py-1.5 text-xs bg-[#1a2828] border border-[#2a3838] rounded-lg text-white hover:border-[#ffa9fc]"
                    title="Bold (wrap selection with ** **)"
                  >
                    Bold
                  </button>
                  <button
                    type="button"
                    onClick={() => applyCsMarkdown('italic')}
                    className="px-2.5 py-1.5 text-xs bg-[#1a2828] border border-[#2a3838] rounded-lg text-white hover:border-[#ffa9fc]"
                    title="Italic (wrap selection with * *)"
                  >
                    Italic
                  </button>
                  <button
                    type="button"
                    onClick={() => applyCsMarkdown('link')}
                    className="px-2.5 py-1.5 text-xs bg-[#1a2828] border border-[#2a3838] rounded-lg text-white hover:border-[#ffa9fc]"
                    title="Insert link [text](https://)"
                  >
                    Link
                  </button>
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={() => setCsShowPreview((v) => !v)}
                    className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${csShowPreview ? 'bg-[#ffa9fc] text-[#0f1c1c] border-[#ffa9fc]' : 'bg-[#1a2828] border-[#2a3838] text-white hover:border-[#ffa9fc]'}`}
                    title="Toggle preview"
                  >
                    {csShowPreview ? 'Hide Preview' : 'Show Preview'}
                  </button>
                  {csShowPreview && (
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        type="button"
                        onClick={() => setCsPreviewTheme('light')}
                        className={`px-2 py-1 text-xs rounded-lg border transition-colors ${csPreviewTheme === 'light' ? 'bg-white text-[#0f1c1c] border-gray-300' : 'bg-[#1a2828] text-white border-[#2a3838] hover:border-[#ffa9fc]'}`}
                        title="Preview on light background"
                      >
                        Light
                      </button>
                      <button
                        type="button"
                        onClick={() => setCsPreviewTheme('dark')}
                        className={`px-2 py-1 text-xs rounded-lg border transition-colors ${csPreviewTheme === 'dark' ? 'bg-[#2a3838] text-white border-[#3a4848]' : 'bg-[#1a2828] text-white border-[#2a3838] hover:border-[#ffa9fc]'}`}
                        title="Preview on dark background"
                      >
                        Dark
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  Tip: select the text first, then click Bold or Italic. For Link, select the text that should become the link.
                </p>
                <textarea
                  ref={comingSoonDescRef}
                  value={comingSoonForm.description}
                  onChange={(e) =>
                    setComingSoonForm({ ...comingSoonForm, description: e.target.value })
                  }
                  placeholder="Enter description (optional)"
                  className="w-full px-4 py-3 h-24 bg-[#0f1c1c] border border-[#2a3838] rounded-xl text-white focus:outline-none focus:border-[#ffa9fc] resize-none"
                />
                {csShowPreview && (
                  <div className={`mt-2 p-3 rounded-lg border ${csPreviewTheme === 'dark' ? 'bg-[#0f1c1c] border-[#2a3838]' : 'bg-white border-gray-200'}`}>
                    <p className={`text-xs font-semibold mb-2 ${csPreviewTheme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>Preview</p>
                    <div className={`${csPreviewTheme === 'dark' ? 'prose prose-invert' : 'prose'} max-w-none text-[15px] leading-snug`}>
                      <MarkdownContent className={`${csPreviewTheme === 'dark' ? 'text-white' : 'text-[#0F1C1C]'}`} content={comingSoonForm.description} isDark={csPreviewTheme === 'dark'} />
                    </div>
                  </div>
                )}
                <div className="mt-2 p-3 bg-[#0f1c1c] border border-[#2a3838] rounded-lg">
                  <p className="text-xs text-gray-400 font-semibold mb-2">💡 Formatting Tips:</p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span className="text-[#ffa9fc] font-mono">**bold text**</span> → <strong className="text-white">bold text</strong>
                      </div>
                      <div>
                        <span className="text-[#ffa9fc] font-mono">*italic text*</span> → <em className="text-white">italic text</em>
                      </div>
                    </div>
                    <div>
                      <span className="text-[#ffa9fc] font-mono">[link text](https://example.com)</span> → <a className="text-[#d97ac8] underline">link text</a>
                    </div>
                    <div className="pt-1 border-t border-[#2a3838] mt-2">
                      <div className="text-gray-400 mb-1">Line breaks:</div>
                      <div className="pl-2 space-y-0.5">
                        <div>• Press Enter once for a line break</div>
                        <div>• Press Enter twice for paragraph spacing</div>
                        <div>• Add multiple blank lines for extra spacing</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#0f1c1c] rounded-xl border border-[#2a3838]">
                <div>
                  <label className="text-lg font-semibold text-gray-300 block mb-1">
                    Visibility
                  </label>
                  <p className="text-sm text-gray-400">
                    Show this section on the homepage
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={comingSoonForm.is_visible}
                    onChange={(e) =>
                      setComingSoonForm({ ...comingSoonForm, is_visible: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#ffa9fc]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ffa9fc]"></div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-[#2a3838]">
              <button
                onClick={() => setShowComingSoonForm(false)}
                className="px-6 py-3 bg-[#2a3838] hover:bg-[#3a4848] rounded-xl font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleComingSoonSubmit}
                className="px-8 py-3 bg-[#ffa9fc] hover:bg-brand-primary-hover rounded-xl font-bold text-[#0f1c1c] hover:scale-105 transition-all shadow-lg"
              >
                {comingSoon ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Episodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedEpisodes.map((episode) => (
          <div
            key={episode.id}
            className="bg-gradient-to-br from-[#1a2828] to-[#0f1c1c] rounded-2xl border border-[#2a3838] p-6 flex flex-col gap-4 hover:border-[#ffa9fc]/30 transition-all"
          >
            <div className="flex justify-between items-start">
              <h2 className="text-xl font-bold text-white line-clamp-2 flex-1 pr-2">
                {episode.title}
              </h2>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => startEdit(episode)}
                  className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                  title="Edit"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(episode)}
                  className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="text-gray-400 text-sm line-clamp-2 flex-grow">
              <MarkdownContent className="text-gray-400 text-sm line-clamp-2" content={episode.excerpt} isDark={true} />
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`text-xs px-3 py-1 rounded-full ${episode.status === "published"
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                  }`}
              >
                {episode.status === "published" ? (
                  <Star size={12} className="inline-block mr-1" />
                ) : (
                  <EyeOff size={12} className="inline-block mr-1" />
                )}
                {episode.status}
              </span>

              {episode.buzzsprout_episode_id && (
                <span className="text-xs px-3 py-1 rounded-full bg-[#ffa9fc]/10 text-[#ffa9fc] border border-[#ffa9fc]/30">
                  <ExternalLink size={12} className="inline-block mr-1" />
                  Buzzsprout
                </span>
              )}
            </div>

            <div className="text-xs text-gray-500 pt-3 border-t border-[#2a3838]">
              {new Date(episode.date_published).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
        ))}
      </div>

      {sortedEpisodes.length === 0 && (
        <div className="text-center py-20 bg-[#1a2828] rounded-2xl border border-[#2a3838]">
          <p className="text-gray-400 text-lg mb-2">No episodes found</p>
          <p className="text-gray-500 text-sm mb-6">
            {searchTerm || statusFilter !== "all"
              ? "Try adjusting your filters"
              : "Create your first episode to get started"}
          </p>
        </div>
      )}
    </div>
  );
}