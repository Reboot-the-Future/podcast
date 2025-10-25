"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, Shield } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Login › Reboot Admin";
  }, []);

  // Show notice when redirected after logout
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!searchParams) return;
    if (searchParams.get('logged_out') === '1') {
      setNotice('You have been logged out.');
      const timeout = setTimeout(() => setNotice(""), 4000);
      return () => clearTimeout(timeout);
    }
  }, [searchParams]);

  interface LoginResponse {
    token?: string;
    error?: string;
  }

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res: Response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data: LoginResponse = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid email or password");
        setLoading(false);
        return;
      }

      localStorage.setItem("admin_token", data.token as string);
      router.replace("/admin");
    } catch (error) {
      console.error("Login error:", error);
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  };

  const isFormValid = email.trim() && password.length >= 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1c1c] via-[#1a2828] to-[#0f1c1c] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#ffa9fc]/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-[#00ffaa]/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block p-4 bg-gradient-to-br from-[#ffa9fc]/20 to-[#ff8df7]/10 rounded-2xl mb-6 border border-[#ffa9fc]/30 shadow-lg shadow-[#ffa9fc]/10">
            <Shield size={44} className="text-[#ffa9fc]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 tracking-tight">
            <span className="text-white">Reboot</span>
            <span className="text-[#ffa9fc]">The</span>
            <span className="text-white">Future</span>
          </h1>
          <p className="text-gray-400 text-lg font-medium">Admin Portal</p>
          <p className="text-gray-500 text-sm mt-2">Manage your podcast and content</p>
        </div>

        {/* Login Card */}
        <div className="bg-gradient-to-br from-[#1a2828]/95 to-[#0f1c1c]/95 backdrop-blur-xl rounded-3xl p-8 space-y-6 shadow-2xl border border-[#2a3838]/50 hover:border-[#2a3838] transition-all">
          {/* Success/Info Notice */}
          {notice && (
            <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{notice}</p>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-300">
              Email Address
            </label>
            <div className={`relative transition-all ${focusedField === 'email' ? 'ring-2 ring-[#ffa9fc]/30' : ''}`}>
              <Mail size={20} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'email' ? 'text-[#ffa9fc]' : 'text-gray-400'}`} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                className="w-full pl-12 pr-4 py-3.5 bg-[#0f1c1c] border border-[#2a3838] rounded-xl focus:outline-none focus:border-[#ffa9fc] transition-all text-white"
                disabled={loading}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-300">
              Password
            </label>
            <div className={`relative transition-all ${focusedField === 'password' ? 'ring-2 ring-[#ffa9fc]/30' : ''}`}>
              <Lock size={20} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'password' ? 'text-[#ffa9fc]' : 'text-gray-400'}`} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                onKeyDown={(e) => e.key === 'Enter' && isFormValid && handleSubmit(e)}
                className="w-full pl-12 pr-12 py-3.5 bg-[#0f1c1c] border border-[#2a3838] rounded-xl focus:outline-none focus:border-[#ffa9fc] focus:ring-2 focus:ring-[#ffa9fc]/20 transition-all text-white placeholder-gray-600"
                placeholder="••••••••"
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            onClick={handleSubmit}
            disabled={loading || !isFormValid}
            className="w-full py-3.5 bg-gradient-to-r from-[#ffa9fc] to-[#ff8df7] hover:from-[#ff8df7] hover:to-[#ffa9fc] text-[#0f1c1c] font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#ffa9fc]/20 hover:shadow-[#ffa9fc]/40 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group focus:outline-none focus:ring-2 focus:ring-[#ffa9fc] focus:ring-offset-2"
            aria-label={loading ? "Logging in" : "Login to dashboard"}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-[#0f1c1c]/30 border-t-[#0f1c1c] rounded-full animate-spin"></div>
                Logging in...
              </>
            ) : (
              <>
                Login to Dashboard
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>


        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-8 flex items-center justify-center gap-1">
          <Shield size={14} />
          Protected area. Authorized access only.
        </p>
      </div>
    </div>
  );
}