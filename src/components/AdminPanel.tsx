import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Package, 
  Users, 
  Database, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Search,
  ChevronRight,
  Camera,
  Image as ImageIcon,
  X,
  ArrowLeft
} from 'lucide-react';
import { db, Item, Vendor, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

interface AdminPanelProps {
  type: 'items' | 'vendors';
}

const SEED_ITEMS = [
  { name: 'BROCCOLI', unit: 'KG' },
  { name: 'COCONUT', unit: 'PCS' },
  { name: 'SWEET CORN', unit: 'KG' },
  { name: 'SPRING ONION', unit: 'BUNCH' },
  { name: 'GOOSE BERRY', unit: 'KG' },
  { name: 'TENDER COCONUT', unit: 'PCS' },
  { name: 'SAMBAR ONION', unit: 'KG' },
  { name: 'CURRY LEAVES', unit: 'KG' },
  { name: 'MANGO GINGER', unit: 'KG' },
  { name: 'APPLE-BER', unit: 'KG' },
  { name: 'RAW TURMERIC', unit: 'KG' },
  { name: 'NAGPUR ORANGE', unit: 'KG' },
  { name: 'BOTTLE GOURD ROUND', unit: 'KG' },
  { name: 'GARLIC', unit: 'KG' },
  { name: 'OYSTER MUSHROOM', unit: 'KG' },
  { name: 'STRIPED WATERMELON', unit: 'KG' },
  { name: 'SUGAR BABY WATERMELON', unit: 'KG' },
];

export default function AdminPanel({ type }: AdminPanelProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ name: '', unit: 'KG', contact: '', imageUrl: '' });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { // 500KB limit for base64 in firestore
        alert('Image size too large. Please select an image under 500KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItem(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const q = query(collection(db, type), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, type));

    return () => unsubscribe();
  }, [type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name) return;
    
    setError(null);
    const normalizedName = newItem.name.trim().toUpperCase();
    
    // Check for duplicates
    const isDuplicate = data.some(d => d.name.toUpperCase() === normalizedName && d.id !== editingId);
    if (isDuplicate) {
      setError(`A ${type === 'items' ? 'item' : 'vendor'} with the name "${normalizedName}" already exists.`);
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        name: normalizedName,
        imageUrl: newItem.imageUrl,
      };
      if (type === 'items') payload.unit = newItem.unit;
      if (type === 'vendors') payload.contact = newItem.contact;

      if (editingId) {
        await updateDoc(doc(db, type, editingId), payload);
        setEditingId(null);
      } else {
        payload.createdAt = Timestamp.now();
        await addDoc(collection(db, type), payload);
      }
      setNewItem({ name: '', unit: 'KG', contact: '', imageUrl: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: any) => {
    setError(null);
    setEditingId(item.id);
    setNewItem({
      name: item.name,
      unit: item.unit || 'KG',
      contact: item.contact || '',
      imageUrl: item.imageUrl || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setError(null);
    setEditingId(null);
    setNewItem({ name: '', unit: 'KG', contact: '', imageUrl: '' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to delete this ${type === 'items' ? 'item' : 'vendor'}?`)) return;
    try {
      await deleteDoc(doc(db, type, id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSeedAll = async () => {
    if (!confirm('This will add dummy items, vendors, and sample procurement entries. Continue?')) return;
    setSubmitting(true);
    try {
      // 1. Seed Items
      const itemIds: string[] = [];
      const itemImages = [
        'https://picsum.photos/seed/broccoli/200',
        'https://picsum.photos/seed/coconut/200',
        'https://picsum.photos/seed/corn/200',
        'https://picsum.photos/seed/onion/200',
        'https://picsum.photos/seed/berry/200'
      ];
      for (let i = 0; i < SEED_ITEMS.slice(0, 5).length; i++) {
        const item = SEED_ITEMS[i];
        const existing = data.find(d => d.name === item.name);
        if (!existing) {
          const docRef = await addDoc(collection(db, 'items'), {
            ...item,
            imageUrl: itemImages[i],
            createdAt: Timestamp.now()
          });
          itemIds.push(docRef.id);
        } else {
          itemIds.push(existing.id);
        }
      }

      // 2. Seed Vendors
      const vendors = [
        { name: 'FRESH FARMS', contact: '9876543210', imageUrl: 'https://picsum.photos/seed/farm1/200' },
        { name: 'GREEN VALLEY', contact: 'v@greenvalley.com', imageUrl: 'https://picsum.photos/seed/farm2/200' },
        { name: 'DAILY FRESH', contact: '8887776665', imageUrl: '' }
      ];
      const vendorIds: string[] = [];
      for (const v of vendors) {
        const docRef = await addDoc(collection(db, 'vendors'), {
          ...v,
          createdAt: Timestamp.now()
        });
        vendorIds.push(docRef.id);
      }

      // 3. Seed Procurements
      const today = format(new Date(), 'yyyy-MM-dd');
      const sampleProcurements = [
        {
          date: today,
          itemId: itemIds[0],
          itemName: SEED_ITEMS[0].name,
          itemImageUrl: itemImages[0],
          vendorId: vendorIds[0],
          vendorName: vendors[0].name,
          vendorImageUrl: vendors[0].imageUrl,
          qty: 50,
          unit: SEED_ITEMS[0].unit,
          rate: 45,
          total: 2250,
          previousPending: 0,
          paidToday: 2000,
          currentPending: 250,
          remarks: 'Good quality batch',
          createdBy: 'system',
          createdAt: Timestamp.now()
        },
        {
          date: today,
          itemId: itemIds[1],
          itemName: SEED_ITEMS[1].name,
          itemImageUrl: itemImages[1],
          vendorId: vendorIds[1],
          vendorName: vendors[1].name,
          vendorImageUrl: vendors[1].imageUrl,
          qty: 100,
          unit: SEED_ITEMS[1].unit,
          rate: 20,
          total: 2000,
          previousPending: 500,
          paidToday: 2500,
          currentPending: 0,
          remarks: 'Cleared old dues',
          createdBy: 'system',
          createdAt: Timestamp.now()
        }
      ];

      for (const p of sampleProcurements) {
        await addDoc(collection(db, 'procurements'), p);
      }

      alert('Dummy data seeded successfully!');
    } catch (err) {
      console.error(err);
      alert('Error seeding data: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredData = data.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-primary/10 p-6 rounded-3xl border-2 border-primary/20">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight capitalize flex items-center gap-3">
            {type === 'items' ? <Package size={32} /> : <Users size={32} />}
            {type} Management
          </h1>
          <p className="text-charcoal/70 font-bold uppercase tracking-widest text-xs mt-1">Manage your {type} for daily procurement</p>
        </div>
        
        {type === 'items' && data.length === 0 && (
          <button 
            onClick={handleSeedAll}
            className="flex items-center gap-2 px-8 py-4 bg-accent text-charcoal font-black rounded-2xl hover:bg-accent/80 transition-all shadow-[4px_4px_0px_0px_rgba(253,216,53,0.3)] active:translate-y-1 active:shadow-none border-2 border-charcoal/10"
          >
            <Database size={20} />
            SEED MARKET DATA
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-3xl shadow-[8px_8px_0px_0px_rgba(251,140,0,0.1)] border-2 border-primary/20 sticky top-28">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-orange-50">
              <div className="p-2 bg-primary text-white rounded-xl shadow-lg">
                {editingId ? <ArrowLeft size={20} className="cursor-pointer" onClick={handleCancelEdit} /> : <Plus size={20} />}
              </div>
              <h3 className="text-xl font-black text-charcoal uppercase tracking-tight">
                {editingId ? `Edit ${type === 'items' ? 'Item' : 'Vendor'}` : `New ${type === 'items' ? 'Item' : 'Vendor'}`}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col items-center gap-4 mb-8">
                <div className="relative group">
                  <div className="w-32 h-32 bg-orange-50 rounded-[2rem] overflow-hidden border-4 border-dashed border-orange-200 flex items-center justify-center group-hover:border-primary transition-all shadow-inner">
                    {newItem.imageUrl ? (
                      <img src={newItem.imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Camera size={40} className="text-orange-200 group-hover:text-primary transition-colors" />
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {newItem.imageUrl && (
                    <button 
                      type="button"
                      onClick={() => setNewItem(prev => ({ ...prev, imageUrl: '' }))}
                      className="absolute -top-2 -right-2 p-2 bg-white rounded-full shadow-xl border-2 border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] bg-primary/10 px-3 py-1 rounded-full">Click to upload photo</p>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 font-bold text-sm border-2 border-red-100"
                >
                  <AlertCircle size={18} />
                  {error}
                </motion.div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-black text-charcoal/60 uppercase tracking-widest ml-1">Name</label>
                <input 
                  type="text" 
                  required
                  placeholder={`Enter ${type === 'items' ? 'item' : 'vendor'} name`}
                  value={newItem.name}
                  onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full px-5 py-4 bg-orange-50 border-2 border-orange-100 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none font-bold text-charcoal placeholder:text-charcoal/30"
                />
              </div>

              {type === 'items' ? (
                <div className="space-y-2">
                  <label className="text-xs font-black text-charcoal/60 uppercase tracking-widest ml-1">Unit</label>
                  <div className="relative">
                    <select 
                      value={newItem.unit}
                      onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                      className="w-full px-5 py-4 bg-orange-50 border-2 border-orange-100 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none font-bold text-charcoal appearance-none cursor-pointer"
                    >
                      <option value="KG">Kilogram (KG)</option>
                      <option value="PCS">Pieces (PCS)</option>
                      <option value="BUNCH">Bunch</option>
                      <option value="LTR">Liter (LTR)</option>
                      <option value="BOX">Box</option>
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-primary pointer-events-none" size={20} />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-black text-charcoal/60 uppercase tracking-widest ml-1">Contact Info</label>
                  <input 
                    type="text" 
                    placeholder="Phone or Email"
                    value={newItem.contact}
                    onChange={e => setNewItem({ ...newItem, contact: e.target.value })}
                    className="w-full px-5 py-4 bg-orange-50 border-2 border-orange-100 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none font-bold text-charcoal placeholder:text-charcoal/30"
                  />
                </div>
              )}

              <div className="pt-4 space-y-3">
                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary/90 transition-all shadow-[0_8px_20px_-4px_rgba(251,140,0,0.4)] active:scale-[0.98] flex items-center justify-center gap-3 border-b-4 border-orange-700"
                >
                  {submitting ? <Loader2 className="animate-spin" size={24} /> : (editingId ? <CheckCircle2 size={24} /> : <Plus size={24} />)}
                  {editingId ? 'UPDATE' : 'ADD'} {type === 'items' ? 'ITEM' : 'VENDOR'}
                </button>
                
                {editingId && (
                  <button 
                    type="button"
                    onClick={handleCancelEdit}
                    className="w-full py-4 bg-orange-100 text-primary rounded-2xl font-black hover:bg-orange-200 transition-all active:scale-[0.98] border-2 border-primary/10"
                  >
                    CANCEL EDIT
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-primary group-focus-within:scale-110 transition-transform" size={24} />
            <input 
              type="text" 
              placeholder={`Search ${type} in the market...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-14 pr-6 py-5 bg-white border-2 border-orange-100 rounded-3xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none font-bold text-charcoal shadow-sm placeholder:text-charcoal/30"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-32 bg-orange-50 rounded-[2rem] animate-pulse border-2 border-orange-100" />
                ))
              ) : filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={item.id}
                    className="bg-white p-6 rounded-[2rem] border-2 border-orange-50 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all group relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 overflow-hidden shadow-inner border border-orange-100">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            type === 'items' ? <Package size={32} /> : (
                              <div className="font-black text-2xl">{item.name.charAt(0)}</div>
                            )
                          )}
                        </div>
                        <div>
                          <h4 className="font-black text-charcoal text-lg leading-tight">{item.name}</h4>
                          <p className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] mt-1 bg-secondary/10 px-2 py-0.5 rounded-md inline-block">
                            {type === 'items' ? item.unit : (item.contact || 'No contact')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleEdit(item)}
                          className="p-3 text-primary hover:bg-primary hover:text-white rounded-2xl transition-all shadow-sm hover:shadow-md"
                        >
                          <ChevronRight size={20} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-3 text-red-400 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-sm hover:shadow-md"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                    {/* Decorative background element */}
                    <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-primary/5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 -z-0 scale-0 group-hover:scale-100" />
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-24 text-center bg-orange-50/50 rounded-[3rem] border-4 border-dashed border-orange-100">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Package className="text-orange-200" size={48} />
                  </div>
                  <h3 className="text-xl font-black text-charcoal/40 uppercase tracking-widest">Market is Empty</h3>
                  <p className="text-charcoal/30 font-bold mt-2">No {type} found in the list</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
