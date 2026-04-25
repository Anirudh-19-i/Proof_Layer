import React from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { motion } from 'motion/react';
import { ShieldCheck, Zap, Users, BrainCircuit, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [loading, setLoading] = React.useState(false);

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Successfully logged in!');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/popup-closed-by-user') {
        // User closed the window, ignore
        return;
      }
      if (error.code === 'auth/unauthorized-domain') {
        toast.error('Domain not authorized in Firebase. Please add your Vercel URL to "Authorized Domains" in the Firebase Console.');
      } else {
        toast.error(`Login failed: ${error.message || 'Failed to log in with Google'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#F27D26] blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 blur-[120px] rounded-full" />
      </div>

      <header className="p-8 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-8 h-8 text-[#F27D26]" />
          <span className="text-xl font-bold tracking-tighter uppercase">AXIOME</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-8 gap-16 z-10">
        <div className="max-w-2xl text-center lg:text-left">
          <motion.h1 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-[12vw] lg:text-[8rem] font-black leading-[0.8] uppercase tracking-tighter mb-8"
          >
            AXI<span className="text-[#F27D26]">OME</span>
          </motion.h1>
          
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 font-medium max-w-lg mb-12"
          >
            The dynamic, resume-free candidate profile built entirely on proof of ability. 
            Eliminate bias, verify skills, and find your perfect fit.
          </motion.p>

          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="px-8 py-4 bg-white text-black font-bold uppercase tracking-widest hover:bg-[#F27D26] hover:text-white transition-all rounded-none flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>Logging in...<Loader2 className="w-5 h-5 animate-spin" /></>
              ) : (
                <>Get Started with Google <Zap className="w-5 h-5 group-hover:fill-current" /></>
              )}
            </button>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
          {[
            { icon: ShieldCheck, title: 'VERIFIED', text: 'Proof over promises' },
            { icon: Zap, title: 'DYNAMIC', text: 'Real-time skill DNA' },
            { icon: Users, title: 'DIVERSITY', text: 'Zero bias hiring' },
            { icon: BrainCircuit, title: 'AI POWERED', text: 'Smart evaluation' }
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="p-6 border border-white/10 bg-white/5 backdrop-blur-sm hover:border-[#F27D26] transition-colors"
            >
              <item.icon className="w-8 h-8 text-[#F27D26] mb-4" />
              <h3 className="font-bold uppercase tracking-widest text-xs opacity-50 mb-1">{item.title}</h3>
              <p className="font-medium">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </main>

      <footer className="p-8 text-xs text-gray-500 uppercase tracking-[0.2em] flex flex-col sm:flex-row justify-between gap-4 z-10">
        <div>© 2026 AXIOME. ALL RIGHTS RESERVED.</div>
        <div className="flex gap-8">
          <a href="#" className="hover:text-white">Privacy</a>
          <a href="#" className="hover:text-white">Terms</a>
          <a href="#" className="hover:text-white">Contact</a>
        </div>
      </footer>
    </div>
  );
}
