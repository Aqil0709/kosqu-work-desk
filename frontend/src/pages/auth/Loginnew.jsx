import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Network,
  CheckCircle2,
  AlertCircle,
  Sunrise,
  Sun,
  Sunset,
  MoonStar
} from 'lucide-react';

import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const MORNING_QUOTES = [
  { text: "Every morning you have two choices: continue sleeping with your dreams, or wake up and chase them.", author: "Unknown" },
  { text: "Rise up, start fresh, see the bright opportunity in each new day.", author: "Unknown" },
  { text: "The sun is a daily reminder that we too can rise again from the darkness.", author: "S. Ajna" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Each morning we are born again. What we do today matters most.", author: "Buddha" },
];

const AFTERNOON_QUOTES = [
  { text: "The afternoon knows what the morning never suspected.", author: "Robert Frost" },
  { text: "Work hard in silence, let your success be your noise.", author: "Frank Ocean" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
  { text: "Success doesn't just find you. You have to go out and get it.", author: "Unknown" },
  { text: "Make each day your masterpiece.", author: "John Wooden" },
  { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
];

const EVENING_QUOTES = [
  { text: "At the end of the day, let there be no excuses, no explanations, no regrets.", author: "Steve Maraboli" },
  { text: "Courage doesn't always roar. Sometimes it's the quiet voice saying 'I'll try again tomorrow.'", author: "Mary Radmacher" },
  { text: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" },
  { text: "Rest when you're weary. Refresh and renew yourself, your body, your mind, your spirit.", author: "Ralph Marston" },
  { text: "Stars can't shine without darkness.", author: "Unknown" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Evening is a time to reflect, breathe, and be grateful.", author: "Unknown" },
];

const NIGHT_QUOTES = [
  { text: "Even the darkest night will end and the sun will rise.", author: "Victor Hugo" },
  { text: "The best bridge between despair and hope is a good night's sleep.", author: "E. Joseph Cossman" },
  { text: "Each night, when I go to sleep, I die. And the next morning, I am reborn.", author: "Mahatma Gandhi" },
  { text: "In the depth of night, stars of hope will shine.", author: "Unknown" },
  { text: "Dreams are illustrations from the book your soul is writing about you.", author: "Marsha Norman" },
  { text: "Let the stars carry your worries tonight.", author: "Unknown" },
  { text: "Sleep is the golden chain that binds health and our bodies together.", author: "Thomas Dekker" },
];

const TIME_THEMES = {
  morning: {
    label: 'Good Morning',
    quotes: MORNING_QUOTES,
    icon: Sunrise,
    bg: 'bg-amber-50 dark:bg-[#1a0f0a]',
    orb1: 'from-amber-300 to-orange-500',
    orb2: 'from-rose-300 to-red-500',
    particle: 'bg-amber-500/40 dark:bg-amber-400/30',
    accent: 'text-amber-600 dark:text-amber-500',
    border: 'border-amber-400 dark:border-amber-500',
    button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/30',
    mesh: 'rgba(217,119,6,0.05)',
    meshDark: 'rgba(245,158,11,0.03)',
  },
  afternoon: {
    label: 'Good Afternoon',
    quotes: AFTERNOON_QUOTES,
    icon: Sun,
    bg: 'bg-blue-50 dark:bg-[#030712]',
    orb1: 'from-cyan-300 to-blue-500',
    orb2: 'from-sky-300 to-indigo-500',
    particle: 'bg-blue-500/40 dark:bg-blue-400/30',
    accent: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-400 dark:border-blue-500',
    button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30',
    mesh: 'rgba(37,99,235,0.05)',
    meshDark: 'rgba(96,165,250,0.03)',
  },
  evening: {
    label: 'Good Evening',
    quotes: EVENING_QUOTES,
    icon: Sunset,
    bg: 'bg-orange-50 dark:bg-[#150a1a]',
    orb1: 'from-orange-400 to-rose-500',
    orb2: 'from-fuchsia-400 to-purple-600',
    particle: 'bg-rose-500/40 dark:bg-rose-400/30',
    accent: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-400 dark:border-rose-500',
    button: 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/30',
    mesh: 'rgba(225,29,72,0.05)',
    meshDark: 'rgba(251,113,133,0.03)',
  },
  night: {
    label: 'Good Night',
    quotes: NIGHT_QUOTES,
    icon: MoonStar,
    bg: 'bg-slate-100 dark:bg-[#020617]',
    orb1: 'from-indigo-600 to-blue-800',
    orb2: 'from-violet-500 to-purple-900',
    particle: 'bg-indigo-500/40 dark:bg-indigo-400/30',
    accent: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-500 dark:border-indigo-400',
    button: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30',
    mesh: 'rgba(79,70,229,0.05)',
    meshDark: 'rgba(129,140,248,0.03)',
  }
};

const getTimeSegment = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12)       return 'morning';
  if (hour >= 12 && hour < 17)      return 'afternoon';
  if (hour >= 17 && hour < 22)      return 'evening';
  return 'night';
};

export default function Login({ initialMode = 'login' }) {
  // --- STATE ---
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showPass, setShowPass] = useState(false);
  
  // Theme & Time State
  const [isDark, setIsDark] = useState(true);
  const [timeSegment, setTimeSegment] = useState(getTimeSegment());
  const [quoteIdx, setQuoteIdx] = useState(0);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // --- EFFECTS ---  
  // Make the URL the single source of truth for the component's mode
  useEffect(() => {
    if (location.pathname === '/forgot-password') {
      setMode('forgot');
    } else {
      setMode('login');
    }
    setError('');
    setMessage('');
  }, [location.pathname]);

  useEffect(() => {
    const t = setInterval(() => setTimeSegment(getTimeSegment()), 60000);
    return () => clearInterval(t);
  }, []);

  // Rotate quotes every 8 seconds for a smooth carousel effect
  useEffect(() => {
    const qTimer = setInterval(() => {
      setQuoteIdx((prev) => prev + 1);
    }, 8000);
    return () => clearInterval(qTimer);
  }, [timeSegment]);

  // Sync dark mode class for Tailwind support
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setForm(prev => ({ ...prev, [id]: value }));
    setError('');
    setMessage('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!form.email) return setError('Please enter your email address.');
    if (!form.password) return setError('Please enter your password.');

    setLoading(true);
    try {
      const result = await login({ email: form.email, password: form.password });
      
      // ✅ EXACT NAVIGATION LOGIC RETAINED HERE
      if (result?.success) {
        if (result.forcePasswordReset) return navigate('/force-reset-password');
        const pos = (result.user?.position || '').toLowerCase();
        if (pos === 'admin' || pos === 'hr' || result.isAdmin) return navigate('/admin');
        if (pos === 'client' || result.isClient) return navigate('/client');
        return navigate('/dashboard');
      }
      
      setError(result?.message || 'Invalid credentials. Please try again.');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Authentication request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!form.email) return setError('Please enter your registered email address.');

    setLoading(true);
    try {
      const res = await authAPI.forgotPassword({ email: form.email });
      setMessage(res?.data?.message || 'If an account exists, a reset link has been sent.');
      setForm(prev => ({ ...prev, password: '' }));
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Extract current time theme config
  const theme = TIME_THEMES[timeSegment];
  const ThemeIcon = isDark ? Sun : MoonStar;
  const TimeIcon = theme.icon;

  return (
    <div className={`min-h-screen w-full flex items-center justify-center font-sans transition-colors duration-1000 overflow-hidden relative ${theme.bg} text-slate-900 dark:text-slate-50`}>
      
      {/* INLINE CSS FOR COMPLEX ANIMATIONS & GLASSMORPHISM */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) scale(1) rotate(0deg); }
          50% { transform: translateY(-30px) scale(1.05) rotate(5deg); }
        }
        @keyframes float-slower {
          0%, 100% { transform: translateY(0) scale(1) rotate(0deg); }
          50% { transform: translateY(30px) scale(1.1) rotate(-5deg); }
        }
        @keyframes particle-up {
          0% { transform: translateY(100vh) scale(0); opacity: 0; }
          20% { opacity: 1; transform: translateY(80vh) scale(1); }
          80% { opacity: 1; transform: translateY(20vh) scale(1); }
          100% { transform: translateY(0) scale(0); opacity: 0; }
        }
        .mesh-grid {
          background-image: 
            linear-gradient(to right, ${theme.mesh} 1px, transparent 1px),
            linear-gradient(to bottom, ${theme.mesh} 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: radial-gradient(circle at center, black, transparent 80%);
          -webkit-mask-image: radial-gradient(circle at center, black, transparent 80%);
        }
        .dark .mesh-grid {
          background-image: 
            linear-gradient(to right, ${theme.meshDark} 1px, transparent 1px),
            linear-gradient(to bottom, ${theme.meshDark} 1px, transparent 1px);
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(255,255,255,0.2) inset;
        }
        .dark .glass-card {
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.02) inset;
        }

        .glass-input {
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
        }
        .dark .glass-input {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .glass-input:focus {
          background: rgba(255, 255, 255, 0.9);
          border-color: #6366f1;
        }
        .dark .glass-input:focus {
          background: rgba(0, 0, 0, 0.4);
          border-color: #6366f1;
        }

        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px ${isDark ? '#0F172A' : '#ffffff'} inset !important;
            -webkit-text-fill-color: ${isDark ? '#f8fafc' : '#0f172a'} !important;
            transition: background-color 5000s ease-in-out 0s;
        }

        .tab-transition {
          transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}} />

      {/* --- DYNAMIC TIME-BASED BACKGROUND --- */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Dynamic Orbs */}
        <div className={`absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-br ${theme.orb1} blur-[100px] rounded-full opacity-40 dark:opacity-20 transition-colors duration-1000`} style={{ animation: 'float-slow 12s ease-in-out infinite' }} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-gradient-to-tl ${theme.orb2} blur-[100px] rounded-full opacity-40 dark:opacity-20 transition-colors duration-1000`} style={{ animation: 'float-slower 16s ease-in-out infinite' }} />
        
        <div className="absolute inset-0 mesh-grid opacity-70 transition-all duration-1000" />
        
        {/* Dynamic Floating Particles */}
        {Array.from({ length: 15 }).map((_, i) => (
          <div 
            key={i}
            className={`absolute rounded-full ${theme.particle} transition-colors duration-1000`}
            style={{
              width: Math.random() * 6 + 2 + 'px',
              height: Math.random() * 6 + 2 + 'px',
              left: Math.random() * 100 + '%',
              animation: `particle-up ${Math.random() * 10 + 10}s linear infinite`,
              animationDelay: `-${Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      {/* Theme Toggle */}
      <button 
        onClick={() => setIsDark(!isDark)}
        className="absolute top-6 right-6 z-50 p-2.5 rounded-full glass-card hover:scale-110 transition-transform duration-200"
        aria-label="Toggle theme"
      >
        <ThemeIcon className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-indigo-600'}`} />
      </button>

      {/* --- MAIN CONTENT SPLIT --- */}
      <div className="relative z-10 flex w-full max-w-7xl h-full lg:h-[85vh] lg:min-h-[700px] items-center justify-center lg:justify-between px-4 sm:px-8 lg:px-12">
        
        {/* LEFT PANEL: AI Graphics (Hidden on Mobile/Tablet) */}
        <div className="hidden lg:flex flex-col justify-center w-1/2 h-full py-12 pr-16 relative">
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300 text-sm font-semibold mb-6 w-fit backdrop-blur-md">
            <Sparkles className="w-4 h-4" />
            Enterprise HRMS Platform
          </div>
          
          <h1 className="text-5xl xl:text-6xl font-extrabold leading-[1.1] tracking-tight mb-6 text-slate-900 dark:text-white">
            Workforce <br />
            management <br />
            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${theme.orb1} animate-pulse`}>
              reimagined.
            </span>
          </h1>
          
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">
            One platform for HR, payroll, attendance, projects and more — powered by intelligent automation.
          </p>

          {/* AI Network Illustration (SVG) */}
          <div className="mt-12 relative w-full max-w-md h-32 opacity-80">
            <Network className={`absolute top-0 left-0 w-16 h-16 ${theme.accent} opacity-40 animate-bounce transition-colors duration-1000`} style={{animationDuration: '4s'}} />
            <div className={`absolute top-8 left-16 w-32 h-[1px] bg-gradient-to-r ${theme.orb1} opacity-40 transition-colors duration-1000`} />
            <Network className={`absolute top-4 left-48 w-12 h-12 ${theme.accent} opacity-40 animate-bounce transition-colors duration-1000`} style={{animationDuration: '5s', animationDelay: '1s'}} />
            <div className={`absolute top-16 left-8 w-[1px] h-16 bg-gradient-to-b ${theme.orb2} opacity-40 transition-colors duration-1000`} />
            <Network className={`absolute top-32 left-4 w-10 h-10 ${theme.accent} opacity-40 animate-bounce transition-colors duration-1000`} style={{animationDuration: '6s', animationDelay: '2s'}} />
          </div>
        </div>

        {/* RIGHT PANEL: The Auth Form Container */}
        <div className="w-full max-w-md lg:w-[450px] relative">
          
          {/* --- GLASS AUTH CARD --- */}
          <div className="glass-card rounded-[2rem] p-8 sm:p-10 relative overflow-hidden shadow-2xl">
            
            {/* Top glowing accent line mapping to time of day */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.orb1} opacity-80 transition-colors duration-1000`} />

            {/* DYNAMIC TIME-BASED QUOTE CAROUSEL */}
            <div className={`mb-8 p-5 rounded-2xl border-l-4 ${theme.border} bg-white/40 dark:bg-black/20 backdrop-blur-md shadow-sm transition-all duration-700 relative overflow-hidden min-h-[130px] flex flex-col justify-center`}>
              <div className="flex items-center gap-2 mb-3">
                <TimeIcon className={`w-5 h-5 ${theme.accent} transition-colors duration-1000`} />
                <span className={`text-xs font-extrabold uppercase tracking-widest ${theme.accent} transition-colors duration-1000`}>
                  {theme.label}
                </span>
              </div>
              
              <div className="relative flex-1">
                {theme.quotes.map((q, idx) => (
                  <div 
                    key={idx}
                    className={`absolute inset-0 transition-all duration-1000 transform flex flex-col justify-center ${
                      idx === (quoteIdx % theme.quotes.length) 
                        ? 'opacity-100 translate-y-0 z-10' 
                        : 'opacity-0 translate-y-4 pointer-events-none z-0'
                    }`}
                  >
                    <p className="text-sm font-medium italic text-slate-700 dark:text-slate-300 leading-relaxed mb-2">
                      "{q.text}"
                    </p>
                    <p className={`text-xs font-bold text-right ${theme.accent} transition-colors duration-1000 mt-auto`}>
                      — {q.author}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Error/Success Alerts */}
            <div className="mb-6 space-y-3">
              {error && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
              {message && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm animate-in fade-in slide-in-from-top-2">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>{message}</p>
                </div>
              )}
            </div>

            {/* Forms Container */}
            <div className="relative min-h-[300px]">
              
              {/* === LOGIN FORM === */}
              <div className={`absolute inset-0 w-full tab-transition ${mode === 'login' ? 'opacity-100 translate-x-0 pointer-events-auto z-10' : 'opacity-0 -translate-x-12 pointer-events-none z-0'}`}>
                
                <div className="mb-6">
                  <h2 className="text-2xl font-bold tracking-tight mb-1 text-slate-900 dark:text-white">Sign In</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Access your organization's workspace</p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
                  
                  {/* Email Field */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Email Address</label>
                    <div className="relative group">
                      <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:${theme.accent} transition-colors`} />
                      <input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        disabled={loading}
                        placeholder="name@company.com"
                        className="w-full glass-input rounded-xl pl-11 pr-4 py-3.5 text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-4 focus:ring-indigo-500/10"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
                      <button 
                        type="button" 
                        onClick={() => navigate('/forgot-password')}
                        className={`text-xs font-semibold ${theme.accent} opacity-80 hover:opacity-100 transition-opacity`}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative group">
                      <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:${theme.accent} transition-colors`} />
                      <input
                        id="password"
                        type={showPass ? 'text' : 'password'}
                        value={form.password}
                        onChange={handleChange}
                        disabled={loading}
                        placeholder="••••••••"
                        className="w-full glass-input rounded-xl pl-11 pr-11 py-3.5 text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-4 focus:ring-indigo-500/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        aria-label={showPass ? "Hide password" : "Show password"}
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full mt-4 text-white font-semibold rounded-xl py-3.5 px-4 shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed ${theme.button}`}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Authenticating...
                      </span>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* === FORGOT PASSWORD FORM === */}
              <div className={`absolute inset-0 w-full tab-transition ${mode === 'forgot' ? 'opacity-100 translate-x-0 pointer-events-auto z-10' : 'opacity-0 translate-x-12 pointer-events-none z-0'}`}>
                
                <button 
                  onClick={() => navigate('/login')}
                  className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to login
                </button>

                <div className="mb-6">
                  <h2 className="text-2xl font-bold tracking-tight mb-1 text-slate-900 dark:text-white">Password Rescue</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">We'll send a recovery link to your email.</p>
                </div>

                <form onSubmit={handleForgotSubmit} className="space-y-4" noValidate>
                  
                  {/* Email Field */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Registered Email</label>
                    <div className="relative group">
                      <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:${theme.accent} transition-colors`} />
                      <input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        disabled={loading}
                        placeholder="name@company.com"
                        className="w-full glass-input rounded-xl pl-11 pr-4 py-3.5 text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-4 focus:ring-indigo-500/10"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full mt-4 text-white font-semibold rounded-xl py-3.5 px-4 shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed ${theme.button}`}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Sending Link...
                      </span>
                    ) : (
                      <>
                        Send Reset Link
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              </div>

            </div>

            {/* Footer Copyright */}
            <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-white/10 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                &copy; {new Date().getFullYear()} Enterprise HRMS Platform.
              </p>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
