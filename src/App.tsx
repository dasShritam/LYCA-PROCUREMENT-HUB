import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  FirebaseUser,
  googleProvider,
  auth,
  db,
  UserProfile,
  UserRole
} from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Users, 
  Package, 
  LogOut, 
  LogIn, 
  ChevronRight, 
  Menu, 
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import TruckLoader from "../src/components/TruckLoader";

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Context for Auth
interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isExec: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isExec: false,
});

export const useAuth = () => useContext(AuthContext);

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  state = { hasError: false, error: null };
  props: { children: React.ReactNode };

  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-zinc-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle size={32} />
              <h1 className="text-2xl font-bold">Something went wrong</h1>
            </div>
            <p className="text-zinc-600 mb-6">
              The application encountered an unexpected error. Please try refreshing the page.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors"
            >
              Reload Application
            </button>
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-6 p-4 bg-zinc-100 rounded-lg text-xs overflow-auto max-h-40">
                {JSON.stringify(error, null, 2)}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return children;
  }
}

// Components
import Dashboard from './components/Dashboard';
import Login from './components/Login';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Check for profile
        const profileRef = doc(db, 'users', firebaseUser.uid);
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
          setProfile(profileSnap.data() as UserProfile);
        } else {
          // Create default profile (Admin if email matches, else default to exec or wait for admin to approve)
          // For this app, we'll auto-assign admin to the specific email, others can be exec for now or wait
          const isAdminEmail =  (firebaseUser.role as string) === 'admin';;
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: isAdminEmail ? 'admin' : 'operation_executive',
            displayName: firebaseUser.displayName || 'User',
          };
          await setDoc(profileRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = profile?.role === 'admin';
  const isExec = profile?.role === 'operation_executive';

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={{ user, profile, loading, isAdmin, isExec }}>
        <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 selection:bg-zinc-900 selection:text-white">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 flex items-center justify-center bg-white z-50"
              >
               <TruckLoader />
              </motion.div>
            ) : !user ? (
              <Login key="login" />
            ) : (
              <Dashboard key="dashboard" />
            )}
          </AnimatePresence>
        </div>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}
