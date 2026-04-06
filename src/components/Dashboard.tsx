import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Users, 
  Package, 
  LogOut, 
  Menu, 
  X,
  TrendingUp,
  Calendar,
  ChevronRight,
  ArrowRight,
  FileText
} from 'lucide-react';
import { useAuth } from '../App';
import { auth, signOut } from '../firebase';
import ProcurementList from './ProcurementList';
import ProcurementForm from './ProcurementForm';
import AdminPanel from './AdminPanel';

type View = 'dashboard' | 'add' | 'items' | 'vendors' | 'reports';

export default function Dashboard() {
  const { profile, isAdmin, isExec } = useAuth();
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editEntryId, setEditEntryId] = useState<string | null>(null);

  const handleLogout = () => signOut(auth);

  const handleEditEntry = (id: string) => {
    setEditEntryId(id);
    setActiveView('add');
  };

  const handleComplete = () => {
    setEditEntryId(null);
    setActiveView('dashboard');
  };

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, roles: ['admin', 'operation_executive'] },
    { id: 'add', label: 'Add Entry', icon: PlusCircle, roles: ['admin', 'operation_executive'] },
    { id: 'items', label: 'Items', icon: Package, roles: ['admin'] },
    { id: 'vendors', label: 'Vendors', icon: Users, roles: ['admin'] },
    { id: 'reports', label: 'Reports', icon: FileText, roles: ['admin', 'operation_executive'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(profile?.role || ''));
//   useEffect(() => {
//   if (window.innerWidth >= 1024) {
//     setIsSidebarOpen(true);
//   }
// }, [isSidebarOpen]);
  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <ProcurementList onEdit={handleEditEntry} />;
      case 'add':
        return <ProcurementForm editId={editEntryId} onComplete={handleComplete} />;
      case 'items':
        return <AdminPanel type="items" />;
      case 'vendors':
        return <AdminPanel type="vendors" />;
      case 'reports':
        return <ProcurementList isReportView onEdit={handleEditEntry} />;
      default:
        return <ProcurementList onEdit={handleEditEntry} />;
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          x: isSidebarOpen ? 0 : -300,
          width: isSidebarOpen ? 280 : 0
        }}
        className={cn(
          "fixed lg:relative z-50 h-full bg-white border-r border-orange-100 flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 lg:w-72 shadow-xl",
          !isSidebarOpen && "lg:w-72"
        )}
        
      >
        <div className="p-8 flex items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Package className="text-white" size={28} />
          </div>
          <span className="text-2xl font-black tracking-tight text-charcoal">LYCA FOOD</span>
        </div>

        <nav className="flex-1 px-4 space-y-3 overflow-y-auto">
          {filteredNav.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'add') setEditEntryId(null);
                setActiveView(item.id as View);
                setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all group border-2",
                activeView === item.id 
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-105" 
                  : "text-zinc-500 border-transparent hover:bg-orange-50 hover:text-primary hover:border-orange-100"
              )}
            >
              <item.icon size={24} className={cn(
                "transition-transform group-hover:scale-110",
                activeView === item.id ? "text-white" : "text-zinc-400"
              )} />
              <span className="text-lg">{item.label}</span>
              {activeView === item.id && (
                <motion.div layoutId="active-pill" className="ml-auto">
                  <ChevronRight size={20} />
                </motion.div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-orange-50">
          <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-2xl mb-4 border border-orange-100">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-black shadow-inner">
              {profile?.displayName?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-black text-charcoal truncate">{profile?.displayName}</p>
              <p className="text-xs font-bold text-primary uppercase tracking-widest">{profile?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-5 py-4 text-red-600 font-black rounded-2xl hover:bg-red-50 transition-all active:scale-95 border-2 border-transparent hover:border-red-100"
          >
            <LogOut size={24} />
            SIGN OUT
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-24 bg-white/90 backdrop-blur-md border-b-4 border-accent flex items-center justify-between px-6 md:px-10 sticky top-0 z-30 shadow-sm">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-3 text-primary hover:bg-orange-50 rounded-2xl transition-colors border-2 border-orange-100"
          >
            <Menu size={28} />
          </button>
          
          <div className="flex items-center gap-4 bg-orange-50 px-6 py-3 rounded-2xl border border-orange-100">
            <Calendar className="text-primary" size={24} />
            <span className="text-charcoal font-black text-lg">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-xs font-black text-primary uppercase tracking-widest">MARKET STATUS</span>
              <span className="text-base font-black text-secondary flex items-center gap-2">
                <span className="w-3 h-3 bg-secondary rounded-full animate-pulse shadow-[0_0_10px_rgba(67,160,71,0.5)]" />
                OPEN & BUSY
              </span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="max-w-7xl mx-auto"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// Utility for tailwind classes
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
