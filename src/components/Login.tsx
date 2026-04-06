import React from 'react';
import { motion } from 'motion/react';
import { LogIn, ShieldCheck } from 'lucide-react';
import { signInWithPopup, auth, googleProvider } from '../firebase';

export default function Login() {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 overflow-hidden relative">
      {/* Background Market Vibes */}
      <motion.div 
        animate={{ 
          rotate: [0, 10, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-48 -left-48 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] opacity-60"
      />
      <motion.div 
        animate={{ 
          rotate: [0, -15, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-48 -right-48 w-[700px] h-[700px] bg-secondary/10 rounded-full blur-[120px] opacity-40"
      />
      
      {/* Floating Accent Circles */}
      <motion.div 
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 right-1/4 w-32 h-32 bg-accent/20 rounded-full blur-2xl"
      />

      <motion.div 
        initial={{ opacity: 0, y: 40, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(251,140,0,0.2)] p-10 md:p-14 border-4 border-orange-50 relative z-10"
      >
        <div className="flex flex-col items-center text-center">
          <motion.div 
            whileHover={{ rotate: 15, scale: 1.15 }}
            className="w-24 h-24 bg-primary rounded-[2rem] flex items-center justify-center mb-10 shadow-[0_12px_24px_-4px_rgba(251,140,0,0.5)] border-b-8 border-orange-700"
          >
            <ShieldCheck className="text-white" size={48} />
          </motion.div>
          
          <h1 className="text-5xl font-black text-charcoal mb-3 tracking-tighter">
            Lyca <span className="text-primary italic">Food</span>
          </h1>
          <p className="text-charcoal/60 mb-12 font-black uppercase tracking-[0.2em] text-xs bg-accent/20 px-4 py-1.5 rounded-full">
            Market Procurement System
          </p>
          
          <div className="w-full space-y-6">
            <button 
              onClick={handleLogin}
              className="w-full group flex items-center justify-center gap-4 py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary/90 transition-all active:scale-95 shadow-[0_12px_24px_-4px_rgba(251,140,0,0.4)] border-b-4 border-orange-700"
            >
              <LogIn size={24} className="group-hover:translate-x-1 transition-transform" />
              SIGN IN TO MARKET
            </button>
            
            <div className="pt-6 border-t-2 border-orange-50">
              <p className="text-[10px] font-black text-charcoal/40 uppercase tracking-[0.15em] leading-relaxed">
                Authorized Personnel Only<br />
                <span className="text-primary/60">Please sign in with your company email</span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
