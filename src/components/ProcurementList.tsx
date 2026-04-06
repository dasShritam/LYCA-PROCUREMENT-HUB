import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Trash2, 
  AlertCircle,
  Package,
  Users,
  TrendingUp,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Edit2
} from 'lucide-react';
import { db, ProcurementEntry, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, where } from 'firebase/firestore';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { useAuth } from '../App';

interface ProcurementListProps {
  isReportView?: boolean;
  onEdit?: (id: string) => void;
}

type FilterMode = 'current' | 'range' | 'all';

export default function ProcurementList({ isReportView = false, onEdit }: ProcurementListProps) {
  const { isAdmin } = useAuth();
  const [data, setData] = useState<ProcurementEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>(isReportView ? 'all' : 'current');
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'procurements'), 
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProcurementEntry)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'procurements'));

    return () => unsubscribe();
  }, []);

  const filteredData = useMemo(() => {
    const filtered = data.filter(entry => {
      const matchesSearch = 
        entry.itemName.toLowerCase().includes(search.toLowerCase()) ||
        entry.vendorName.toLowerCase().includes(search.toLowerCase());
      
      let matchesDate = true;
      if (filterMode === 'current') {
        matchesDate = entry.date === format(new Date(), 'yyyy-MM-dd');
      } else if (filterMode === 'range') {
        matchesDate = entry.date >= startDate && entry.date <= endDate;
      }
      // 'all' mode matchesDate remains true

      return matchesSearch && matchesDate;
    });

    // Sort by date (descending) then by itemName (ascending)
    return filtered.sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return a.itemName.localeCompare(b.itemName);
    });
  }, [data, search, filterMode, startDate, endDate]);

  const stats = useMemo(() => {
    const totalAmount = filteredData.reduce((sum, e) => sum + e.total, 0);
    const totalPaid = filteredData.reduce((sum, e) => sum + (e.paidToday || 0), 0);
    const totalPending = filteredData.reduce((sum, e) => sum + (e.currentPending || 0), 0);
    return { totalAmount, totalPaid, totalPending };
  }, [filteredData]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      await deleteDoc(doc(db, 'procurements', id));
    } catch (err) {
      console.error(err);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Item', 'Vendor', 'Qty', 'Unit', 'Rate', 'Total', 'Paid', 'Pending', 'Remarks'];
    const rows = filteredData.map(e => [
      e.date,
      e.itemName,
      e.vendorName,
      e.qty,
      e.unit,
      e.rate,
      e.total,
      e.paidToday || 0,
      e.currentPending || 0,
      e.remarks || ''
    ]);
    
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `procurement_report_${dateFilter}.csv`;
    link.click();
  };

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Procurement', value: stats.totalAmount, icon: Package, color: 'primary' },
          { label: 'Total Paid', value: stats.totalPaid, icon: ArrowUpRight, color: 'secondary' },
          { label: 'Total Pending', value: stats.totalPending, icon: ArrowDownRight, color: 'stock-low' },
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 rounded-[2rem] border-2 border-orange-50 shadow-lg hover:shadow-xl transition-all group overflow-hidden relative"
          >
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <h3 className={cn(
                  "text-4xl font-black tracking-tight",
                  stat.color === 'secondary' ? "text-secondary" : stat.color === 'stock-low' ? "text-stock-low" : "text-primary"
                )}>
                  ₹{stat.value.toLocaleString()}
                </h3>
              </div>
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 shadow-inner",
                stat.color === 'secondary' ? "bg-green-50 text-secondary" : stat.color === 'stock-low' ? "bg-red-50 text-stock-low" : "bg-orange-50 text-primary"
              )}>
                <stat.icon size={32} />
              </div>
            </div>
            {/* Decorative background element */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-orange-50/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity -z-0" />
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-6 bg-white p-8 rounded-[2.5rem] border-2 border-orange-50 shadow-xl">
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-3">
            {[
              { id: 'current', label: 'TODAY' },
              { id: 'range', label: 'DATE RANGE' },
              { id: 'all', label: 'OVERALL TOTAL' },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setFilterMode(mode.id as FilterMode)}
                className={cn(
                  "px-6 py-3 rounded-2xl text-sm font-black transition-all border-2",
                  filterMode === mode.id 
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105" 
                    : "bg-orange-50 text-primary border-orange-100 hover:bg-orange-100"
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="flex gap-3 w-full lg:w-auto">
            <button 
              onClick={exportToCSV}
              className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-secondary text-white font-black rounded-2xl hover:bg-green-700 transition-all shadow-lg active:scale-95 text-base border-b-4 border-green-800"
            >
              <Download size={24} />
              EXPORT CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-primary" size={24} />
            <input 
              type="text" 
              placeholder="Search items or vendors..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-orange-50 border-2 border-orange-100 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none font-bold text-charcoal placeholder:text-orange-200"
            />
          </div>

          {filterMode === 'range' && (
            <>
              <div className="relative">
                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-primary" size={20} />
                <input 
                  type="date" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 bg-orange-50 border-2 border-orange-100 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none font-bold text-sm"
                />
                <span className="absolute -top-3 left-5 px-2 bg-white text-[10px] font-black text-primary uppercase tracking-widest border border-orange-100 rounded-full">From</span>
              </div>
              <div className="relative">
                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-primary" size={20} />
                <input 
                  type="date" 
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 bg-orange-50 border-2 border-orange-100 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none font-bold text-sm"
                />
                <span className="absolute -top-3 left-5 px-2 bg-white text-[10px] font-black text-primary uppercase tracking-widest border border-orange-100 rounded-full">To</span>
              </div>
            </>
          )}

          {filterMode === 'current' && (
            <div className="relative md:col-span-2 lg:col-span-2">
              <div className="w-full px-6 py-4 bg-accent/10 border-2 border-accent rounded-2xl flex items-center gap-4 text-primary font-black">
                <Calendar size={24} />
                <span>TODAY: {format(new Date(), 'MMMM do, yyyy')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* List / Table */}
      <div className="bg-white rounded-[2.5rem] border-2 border-orange-50 shadow-xl overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-orange-50/50 border-b-2 border-orange-100">
                <th className="px-8 py-6 text-xs font-black text-primary uppercase tracking-widest">Item / Vendor / Date</th>
                <th className="px-8 py-6 text-xs font-black text-primary uppercase tracking-widest">Qty / Rate</th>
                <th className="px-8 py-6 text-xs font-black text-primary uppercase tracking-widest">Total</th>
                <th className="px-8 py-6 text-xs font-black text-primary uppercase tracking-widest hidden lg:table-cell">Status</th>
                <th className="px-8 py-6 text-xs font-black text-primary uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            {loading ? (
              <tbody className="divide-y divide-orange-50">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-10"><div className="h-6 bg-orange-50 rounded-full w-full" /></td>
                  </tr>
                ))}
              </tbody>
            ) : filteredData.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {filteredData.map((entry) => (
                  <motion.tbody 
                    key={entry.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="divide-y divide-orange-50 border-b-2 border-orange-50 last:border-0"
                  >
                    <tr 
                      className={cn(
                        "group hover:bg-orange-50/30 transition-all cursor-pointer",
                        expandedId === entry.id && "bg-orange-50/50"
                      )}
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all overflow-hidden shadow-md border border-orange-100">
                            {entry.itemImageUrl ? (
                              <img src={entry.itemImageUrl} alt={entry.itemName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <Package size={28} />
                            )}
                          </div>
                          <div>
                            <p className="text-lg font-black text-charcoal">{entry.itemName}</p>
                            <div className="flex flex-col gap-0.5">
                              <p className="text-sm font-bold text-primary flex items-center gap-2">
                                {entry.vendorImageUrl ? (
                                  <img src={entry.vendorImageUrl} alt={entry.vendorName} className="w-4 h-4 rounded-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <Users size={14} />
                                )}
                                {entry.vendorName}
                              </p>
                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Calendar size={12} className="text-primary/40" />
                                {format(new Date(entry.date), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-base font-black text-charcoal">{entry.qty} {entry.unit}</p>
                        <p className="text-xs font-bold text-zinc-400">@ ₹{entry.rate}/{entry.unit}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-lg font-black text-charcoal">₹{entry.total.toLocaleString()}</p>
                        <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Paid: ₹{entry.paidToday?.toLocaleString()}</p>
                      </td>
                      <td className="px-8 py-6 hidden lg:table-cell">
                        <div className={cn(
                          "px-4 py-2 rounded-full text-xs font-black inline-flex items-center gap-2 border-2",
                          (entry.currentPending || 0) > 0 
                            ? "bg-red-50 text-stock-low border-red-100" 
                            : "bg-green-50 text-stock-available border-green-100"
                        )}>
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            (entry.currentPending || 0) > 0 ? "bg-stock-low animate-pulse" : "bg-stock-available"
                          )} />
                          {(entry.currentPending || 0) > 0 ? `DUE: ₹${entry.currentPending?.toLocaleString()}` : "PAID"}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {isAdmin && (
                            <div className="flex items-center gap-3">
                              {onEdit && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); onEdit(entry.id); }}
                                  className="p-3 text-zinc-400 hover:text-primary hover:bg-orange-50 rounded-2xl transition-all border-2 border-transparent hover:border-orange-100"
                                  title="Edit Entry"
                                >
                                  <Edit2 size={20} />
                                </button>
                              )}
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                                className="p-3 text-zinc-400 hover:text-stock-low hover:bg-red-50 rounded-2xl transition-all border-2 border-transparent hover:border-red-100"
                                title="Delete Entry"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                          )}
                          <div className="p-3 text-primary group-hover:scale-125 transition-transform">
                            {expandedId === entry.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                          </div>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Details */}
                    <AnimatePresence>
                      {expandedId === entry.id && (
                        <motion.tr 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-zinc-50/80"
                        >
                          <td colSpan={5} className="px-6 py-6 border-t border-zinc-100">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Item Details</p>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-zinc-400 overflow-hidden shadow-sm">
                                    {entry.itemImageUrl ? (
                                      <img src={entry.itemImageUrl} alt={entry.itemName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                      <Package size={20} />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-zinc-900">{entry.itemName}</p>
                                    <p className="text-xs text-zinc-500">{entry.unit}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Financial Breakdown</p>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500">Previous Pending</span>
                                    <span className="font-bold">₹{entry.previousPending?.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500">Current Total</span>
                                    <span className="font-bold">₹{entry.total.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-sm border-t border-zinc-200 pt-1">
                                    <span className="text-zinc-500 font-bold">Total Due</span>
                                    <span className="font-bold">₹{((entry.previousPending || 0) + entry.total).toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Vendor Details</p>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-zinc-400 overflow-hidden shadow-sm">
                                    {entry.vendorImageUrl ? (
                                      <img src={entry.vendorImageUrl} alt={entry.vendorName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="font-bold text-lg">{entry.vendorName.charAt(0)}</div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-zinc-900">{entry.vendorName}</p>
                                    <p className="text-xs text-zinc-500">ID: {entry.vendorId}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-zinc-100">
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Remarks</p>
                              <p className="text-sm text-zinc-600 italic">
                                {entry.remarks || 'No remarks provided for this entry.'}
                              </p>
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </motion.tbody>
                ))}
              </AnimatePresence>
            ) : (
              <tbody className="divide-y divide-zinc-50">
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <FileText className="mx-auto text-zinc-200 mb-4" size={48} />
                    <p className="text-zinc-400 font-medium">No procurement entries found for this period</p>
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden p-4 space-y-4 bg-orange-50/30">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 bg-white rounded-3xl animate-pulse border-2 border-orange-100" />
            ))
          ) : filteredData.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {filteredData.map((entry) => (
                <motion.div 
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-3xl border-2 border-orange-100 overflow-hidden shadow-sm"
                >
                  <div 
                    className="p-5"
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-primary overflow-hidden border border-orange-100">
                          {entry.itemImageUrl ? (
                            <img src={entry.itemImageUrl} alt={entry.itemName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Package size={24} />
                          )}
                        </div>
                        <div>
                          <h4 className="font-black text-charcoal leading-tight">{entry.itemName}</h4>
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-0.5">{entry.vendorName}</p>
                        </div>
                      </div>
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black border",
                        (entry.currentPending || 0) > 0 
                          ? "bg-red-50 text-stock-low border-red-100" 
                          : "bg-green-50 text-stock-available border-green-100"
                      )}>
                        {(entry.currentPending || 0) > 0 ? "DUE" : "PAID"}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-orange-50/50 p-3 rounded-2xl">
                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Quantity</p>
                        <p className="text-sm font-black text-charcoal">{entry.qty} {entry.unit}</p>
                      </div>
                      <div className="bg-orange-50/50 p-3 rounded-2xl">
                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total Amount</p>
                        <p className="text-sm font-black text-charcoal">₹{entry.total.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-orange-50">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        {format(new Date(entry.date), 'MMM dd, yyyy')}
                      </p>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <>
                            {onEdit && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); onEdit(entry.id); }}
                                className="p-2 text-zinc-400 hover:text-primary"
                              >
                                <Edit2 size={18} />
                              </button>
                            )}
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                              className="p-2 text-zinc-400 hover:text-stock-low"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                        <div className="p-2 text-primary">
                          {expandedId === entry.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedId === entry.id && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-zinc-50 border-t border-orange-100 p-5 space-y-4"
                      >
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Financial Details</p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-zinc-500">Rate</span>
                              <span className="font-bold">₹{entry.rate}/{entry.unit}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-zinc-500">Paid Today</span>
                              <span className="font-bold text-secondary">₹{entry.paidToday?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-zinc-500">Current Pending</span>
                              <span className="font-bold text-stock-low">₹{entry.currentPending?.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        {entry.remarks && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Remarks</p>
                            <p className="text-xs text-zinc-600 italic">{entry.remarks}</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-orange-100">
              <FileText className="mx-auto text-zinc-200 mb-4" size={48} />
              <p className="text-zinc-400 font-medium">No entries found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Utility for tailwind classes
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
