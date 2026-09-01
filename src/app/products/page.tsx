'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Search, Edit2, Trash2, Play, Pause, X,
  Package, Filter, ChevronLeft, ChevronRight, Link as LinkIcon, Loader2,
} from 'lucide-react';
import { formatCurrency, formatNumber, formatDate, cn, getStockStatus } from '@/lib/utils';

interface Product {
  id: string; name: string; image: string | null; description: string | null;
  category: string | null; brand: string | null; sku: string | null;
  sellingPrice: number; costPrice: number; startingQuantity: number;
  currentQuantity: number; lowStockLimit: number; status: string;
  trackingActive: boolean; trackingStartDate: string | null;
  createdAt: string; updatedAt: string;
}

const emptyForm = {
  name: '', image: '', description: '', category: '', brand: '', sku: '',
  sellingPrice: '', costPrice: '', startingQuantity: '', currentQuantity: '',
  lowStockLimit: '10', trackingActive: false, productUrl: '',
};

const categories = ['Smartphone', 'Laptop', 'Audio', 'Wearable', 'Accessories', 'Gaming', 'Camera', 'Other'];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [extracting, setExtracting] = useState(false);
  const limit = 12;

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category', categoryFilter);
      const res = await fetch(`/api/products?${params}`);
      const json = await res.json();
      setProducts(json.products);
      setTotal(json.total);
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editId ? `/api/products/${editId}` : '/api/products';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast(editId ? 'Product updated' : 'Product created');
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
      fetchProducts();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error saving product', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      showToast('Product deleted');
      setDeleteConfirm(null);
      fetchProducts();
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  const toggleTracking = async (p: Product) => {
    await fetch(`/api/products/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackingActive: !p.trackingActive }),
    });
    showToast(p.trackingActive ? 'Tracking paused' : 'Tracking activated');
    fetchProducts();
  };

  const openEdit = (p: Product) => {
    setEditId(p.id);
    setForm({
      name: p.name, image: p.image || '', description: p.description || '',
      category: p.category || '', brand: p.brand || '', sku: p.sku || '',
      sellingPrice: String(p.sellingPrice), costPrice: String(p.costPrice),
      startingQuantity: String(p.startingQuantity), currentQuantity: String(p.currentQuantity),
      lowStockLimit: String(p.lowStockLimit), trackingActive: p.trackingActive, productUrl: '',
    });
    setShowForm(true);
  };

  const handleExtract = async () => {
    if (!form.productUrl) return;
    setExtracting(true);
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: form.productUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        setForm((f) => ({
          ...f,
          name: data.name || f.name,
          description: data.description || f.description,
          category: data.category || f.category,
          brand: data.brand || f.brand,
          sellingPrice: data.price ? String(data.price) : f.sellingPrice,
          image: data.image || f.image,
        }));
        showToast('Product info extracted');
      }
    } catch {
      showToast('Extraction failed — fill manually', 'error');
    } finally {
      setExtracting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 animate-slide-in">
      {toast && (
        <div className={cn('fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white', toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500')}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Products</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{formatNumber(total)} products</p>
        </div>
        <button
          onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text" placeholder="Search products..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="pl-10 pr-8 py-2.5 rounded-lg border text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl p-4 border animate-pulse" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="h-32 rounded-lg bg-gray-200 dark:bg-gray-700 mb-3" />
              <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
              <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="w-16 h-16 mb-4" style={{ color: 'var(--text-secondary)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>No products found</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Add your first product to start tracking</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((p) => {
              const stock = getStockStatus(p.currentQuantity, p.lowStockLimit);
              const sold = p.startingQuantity - p.currentQuantity;
              return (
                <div key={p.id} className="rounded-xl border overflow-hidden group" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <div className="h-36 bg-gray-100 dark:bg-gray-800 relative flex items-center justify-center">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {p.trackingActive && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" /> Live
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-sm font-semibold truncate flex-1" style={{ color: 'var(--text-primary)' }}>{p.name}</h3>
                    </div>
                    {p.category && <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{p.category}{p.brand ? ` · ${p.brand}` : ''}</p>}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-brand-600">{formatCurrency(p.sellingPrice)}</span>
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', stock.color === 'green' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : stock.color === 'yellow' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300')}>
                        {stock.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                      <div>Stock: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{p.currentQuantity}</span></div>
                      <div>Sold: <span className="font-semibold text-emerald-600">{sold > 0 ? sold : 0}</span></div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(p)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => toggleTracking(p)} className={cn('flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium text-white transition-colors', p.trackingActive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600')}>
                        {p.trackingActive ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Track</>}
                      </button>
                      <button onClick={() => setDeleteConfirm(p.id)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-2 rounded-lg border disabled:opacity-40" style={{ borderColor: 'var(--border)' }}><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm px-3" style={{ color: 'var(--text-secondary)' }}>Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="p-2 rounded-lg border disabled:opacity-40" style={{ borderColor: 'var(--border)' }}><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-xl p-6 w-full max-w-sm mx-4" style={{ backgroundColor: 'var(--bg-card)' }}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Delete Product?</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>This will permanently delete this product and all its movement history.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 rounded-lg border text-sm font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8">
          <div className="rounded-xl w-full max-w-lg mx-4 my-auto" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{editId ? 'Edit Product' : 'Add Product'}</h3>
              <button onClick={() => { setShowForm(false); setEditId(null); }} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
              {!editId && (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    <input type="url" placeholder="Product URL (auto-extract)" value={form.productUrl}
                      onChange={(e) => setForm({ ...form, productUrl: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <button type="button" onClick={handleExtract} disabled={!form.productUrl || extracting}
                    className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-1">
                    {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Extract'}
                  </button>
                </div>
              )}
              <FormField label="Product Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
              <FormField label="Image URL" value={form.image} onChange={(v) => setForm({ ...form, image: v })} placeholder="https://..." />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                    <option value="">Select...</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <FormField label="Brand" value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} />
              </div>
              <FormField label="SKU" value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} />
              <FormField label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} textarea />
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Selling Price *" type="number" value={form.sellingPrice} onChange={(v) => setForm({ ...form, sellingPrice: v })} required min="0" step="0.01" />
                <FormField label="Cost Price *" type="number" value={form.costPrice} onChange={(v) => setForm({ ...form, costPrice: v })} required min="0" step="0.01" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label={editId ? 'Current Quantity' : 'Starting Quantity *'} type="number" value={editId ? form.currentQuantity : form.startingQuantity}
                  onChange={(v) => setForm(editId ? { ...form, currentQuantity: v } : { ...form, startingQuantity: v })} required={!editId} min="0" />
                <FormField label="Low Stock Limit" type="number" value={form.lowStockLimit} onChange={(v) => setForm({ ...form, lowStockLimit: v })} min="0" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.trackingActive} onChange={(e) => setForm({ ...form, trackingActive: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Activate live tracking</span>
              </label>
            </form>
            <div className="flex gap-3 p-5 border-t" style={{ borderColor: 'var(--border)' }}>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); }}
                className="flex-1 py-2.5 rounded-lg border text-sm font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>Cancel</button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', required, placeholder, textarea, min, step }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string; textarea?: boolean; min?: string; step?: string;
}) {
  const cls = "w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
  const style = { backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' };
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} className={cn(cls, 'h-20 resize-none')} style={style} placeholder={placeholder} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={cls} style={style} required={required} placeholder={placeholder} min={min} step={step} />
      )}
    </div>
  );
}
