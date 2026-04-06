import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Search, 
  Calendar as CalendarIcon, 
  Package, 
  Users, 
  Save, 
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { db, auth, ProcurementEntry, Item, Vendor, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, getDoc, getDocs, where, Timestamp, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';

interface ProcurementFormProps {
  onComplete: () => void;
  editId?: string | null;
}

export default function ProcurementForm({ onComplete, editId }: ProcurementFormProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    itemId: '',
    vendorId: '',
    qty: 0,
    rate: 0,
    previousPending: 0,
    paidToday: 0,
    remarks: ''
  });

  useEffect(() => {
    const qItems = query(collection(db, 'items'), orderBy('name'));
    const unsubscribeItems = onSnapshot(qItems, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'items'));

    const qVendors = query(collection(db, 'vendors'), orderBy('name'));
    const unsubscribeVendors = onSnapshot(qVendors, (snapshot) => {
      setVendors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'vendors'));

    if (editId) {
      const fetchEntry = async () => {
        try {
          const docRef = doc(db, 'procurements', editId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as ProcurementEntry;
            setFormData({
              date: data.date,
              itemId: data.itemId,
              vendorId: data.vendorId,
              qty: data.qty,
              rate: data.rate,
              previousPending: data.previousPending || 0,
              paidToday: data.paidToday || 0,
              remarks: data.remarks || ''
            });
          }
        } catch (err) {
          console.error('Error fetching entry:', err);
        }
      };
      fetchEntry();
    }

    return () => {
      unsubscribeItems();
      unsubscribeVendors();
    };
  }, [editId]);

  const selectedItem = items.find(i => i.id === formData.itemId);
  const selectedVendor = vendors.find(v => v.id === formData.vendorId);
  const total = formData.qty * formData.rate;
  const currentPending = (formData.previousPending + total) - formData.paidToday;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemId || !formData.vendorId || !formData.qty || !formData.rate) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check for duplicate item and vendor on the same date
      const duplicateQuery = query(
        collection(db, 'procurements'),
        where('date', '==', formData.date)
      );
      const duplicateSnapshot = await getDocs(duplicateQuery);
      
      const isDuplicate = duplicateSnapshot.docs.some(doc => {
        const data = doc.data();
        return doc.id !== editId && 
               data.itemId === formData.itemId && 
               data.vendorId === formData.vendorId;
      });
      
      if (isDuplicate) {
        setError(`An entry for "${selectedItem?.name}" from "${selectedVendor?.name}" already exists on this date. Please modify the existing entry in the Overview Dashboard.`);
        setLoading(false);
        return;
      }

      const entry: any = {
        date: formData.date,
        itemId: formData.itemId,
        itemName: selectedItem?.name || '',
        itemImageUrl: selectedItem?.imageUrl || '',
        vendorId: formData.vendorId,
        vendorName: selectedVendor?.name || '',
        vendorImageUrl: selectedVendor?.imageUrl || '',
        qty: Number(formData.qty),
        unit: selectedItem?.unit || '',
        rate: Number(formData.rate),
        total: total,
        previousPending: Number(formData.previousPending),
        paidToday: Number(formData.paidToday),
        currentPending: currentPending,
        remarks: formData.remarks,
      };

      if (editId) {
        await updateDoc(doc(db, 'procurements', editId), entry);
      } else {
        entry.createdBy = auth.currentUser?.uid || '';
        entry.createdAt = Timestamp.now();
        await addDoc(collection(db, 'procurements'), entry);
      }
      setSuccess(true);
      setTimeout(() => onComplete(), 1500);
    } catch (err) {
      setError('Failed to save entry. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-50">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-3xl font-bold text-zinc-900 mb-2">Entry Saved!</h2>
        <p className="text-zinc-500">Redirecting to dashboard...</p>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between bg-white p-8 rounded-[2rem] border-2 border-orange-50 shadow-xl">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Plus size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-charcoal tracking-tight">{editId ? 'EDIT ENTRY' : 'DAILY PROCUREMENT'}</h1>
            <p className="text-primary font-bold uppercase tracking-widest text-sm">Record daily market procurement</p>
          </div>
        </div>
        <button 
          onClick={onComplete}
          className="p-4 bg-orange-50 border-2 border-orange-100 rounded-2xl text-primary hover:bg-orange-100 transition-all shadow-sm active:scale-95"
        >
          <ArrowLeft size={28} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Basic Info */}
          <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border-2 border-orange-50 space-y-8">
            <h3 className="text-xl font-black text-charcoal flex items-center gap-3 border-b-2 border-orange-50 pb-4">
              <CalendarIcon size={24} className="text-primary" />
              BASIC INFO
            </h3>
            
            <div className="space-y-3">
              <label className="text-sm font-black text-primary uppercase tracking-widest ml-1">Date</label>
              <div className="relative">
                <CalendarIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-primary" size={24} />
                <input 
                  type="date" 
                  required
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full pl-14 pr-6 py-5 bg-orange-50 border-2 border-orange-100 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none font-bold text-lg"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-black text-primary uppercase tracking-widest ml-1">Item Name</label>
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-primary overflow-hidden border-2 border-orange-100 flex-shrink-0 shadow-inner">
                  {selectedItem?.imageUrl ? (
                    <img src={selectedItem.imageUrl} alt={selectedItem.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Package size={32} />
                  )}
                </div>
                <div className="relative flex-1">
                  <select 
                    required
                    value={formData.itemId}
                    onChange={e => setFormData({ ...formData, itemId: e.target.value })}
                    className="w-full pl-6 pr-12 py-5 bg-orange-50 border-2 border-orange-100 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none font-bold text-lg appearance-none"
                  >
                    <option value="">Select an item</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-primary pointer-events-none" size={24} />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-black text-primary uppercase tracking-widest ml-1">Vendor Name</label>
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-primary overflow-hidden border-2 border-orange-100 flex-shrink-0 shadow-inner">
                  {selectedVendor?.imageUrl ? (
                    <img src={selectedVendor.imageUrl} alt={selectedVendor.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    selectedVendor ? (
                      <div className="font-black text-2xl">{selectedVendor.name.charAt(0)}</div>
                    ) : (
                      <Users size={32} />
                    )
                  )}
                </div>
                <div className="relative flex-1">
                  <select 
                    required
                    value={formData.vendorId}
                    onChange={e => setFormData({ ...formData, vendorId: e.target.value })}
                    className="w-full pl-6 pr-12 py-5 bg-orange-50 border-2 border-orange-100 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none font-bold text-lg appearance-none"
                  >
                    <option value="">Select a vendor</option>
                    {vendors.map(vendor => (
                      <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-primary pointer-events-none" size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Financials */}
          <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border-2 border-orange-50 space-y-8">
            <h3 className="text-xl font-black text-charcoal flex items-center gap-3 border-b-2 border-orange-50 pb-4">
              <TrendingUp size={24} className="text-primary" />
              FINANCIALS
            </h3>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-black text-primary uppercase tracking-widest ml-1">Quantity</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  step="0.01"
                  value={formData.qty}
                  onChange={e => setFormData({ ...formData, qty: Number(e.target.value) })}
                  className="w-full px-6 py-5 bg-orange-50 border-2 border-orange-100 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none font-bold text-lg"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-black text-primary uppercase tracking-widest ml-1">Rate</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  step="0.01"
                  value={formData.rate}
                  onChange={e => setFormData({ ...formData, rate: Number(e.target.value) })}
                  className="w-full px-6 py-5 bg-orange-50 border-2 border-orange-100 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none font-bold text-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-black text-primary uppercase tracking-widest ml-1">Prev. Pending</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={formData.previousPending}
                  onChange={e => setFormData({ ...formData, previousPending: Number(e.target.value) })}
                  className="w-full px-6 py-5 bg-orange-50 border-2 border-orange-100 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none font-bold text-lg"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-black text-secondary uppercase tracking-widest ml-1">Paid Today</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={formData.paidToday}
                  onChange={e => setFormData({ ...formData, paidToday: Number(e.target.value) })}
                  className="w-full px-6 py-5 bg-green-50 border-2 border-green-100 rounded-2xl focus:ring-4 focus:ring-secondary/20 focus:border-secondary transition-all outline-none font-bold text-lg text-secondary"
                />
              </div>
            </div>

            <div className="p-8 bg-charcoal rounded-[2rem] text-white flex justify-between items-center shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-1">Total Amount</p>
                <p className="text-4xl font-black">₹{total.toLocaleString()}</p>
              </div>
              <div className="text-right relative z-10">
                <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-1">Current Pending</p>
                <p className={cn("text-4xl font-black", currentPending > 0 ? "text-stock-low" : "text-secondary")}>
                  ₹{currentPending.toLocaleString()}
                </p>
              </div>
              {/* Decorative background element */}
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full" />
            </div>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border-2 border-orange-50 space-y-4">
          <label className="text-sm font-black text-primary uppercase tracking-widest ml-1">Remarks / Notes</label>
          <textarea 
            rows={3}
            value={formData.remarks}
            onChange={e => setFormData({ ...formData, remarks: e.target.value })}
            placeholder="Add any additional notes here..."
            className="w-full px-8 py-6 bg-orange-50 border-2 border-orange-100 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none font-bold text-lg resize-none"
          />
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-6 bg-red-50 text-stock-low rounded-2xl flex items-center gap-4 font-black border-2 border-red-100 shadow-lg"
          >
            <AlertCircle size={28} />
            {error}
          </motion.div>
        )}

        <button 
          type="submit"
          disabled={loading}
          className="w-full py-8 bg-primary text-white rounded-[2.5rem] font-black text-3xl shadow-2xl shadow-primary/30 hover:bg-orange-600 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-4 border-b-8 border-orange-800"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={36} />
          ) : (
            <>
              <Save size={36} />
              {editId ? 'UPDATE ENTRY' : 'SAVE PROCUREMENT'}
            </>
          )}
        </button>
      </form>
    </div>
  );
}

// Utility for tailwind classes
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
function TrendingUp(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
