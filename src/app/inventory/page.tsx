'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatCurrency, formatNumber, cn, getStockStatus } from '@/lib/utils';
import { Warehouse, Search, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface Product {
  id: string; name: string; image: string | null; category: string | null;
  sellingPrice: number; costPrice: number; startingQuantity: number;
  currentQuantity: number; lowStockLimit: number; trackingActive: boolean;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out' | 'healthy'>('all');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/products?limit=200');
      const json = await res.json();
      setProducts(json.products);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 10000); return () => clearInterval(i); }, [fetchData]);

  const filtered = products.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'low') return p.currentQuantity > 0 && p.currentQuantity <= p.lowStockLimit;
    if (filter === 'out') return p.currentQuantity === 0;
    if (filter === 'healthy') return p.currentQuantity > p.lowStockLimit;
    return true;
  });

  const totalValue = products.reduce((s, p) => s + p.currentQuantity * p.costPrice, 0);
  const totalRetail = products.reduce((s, p) => s + p.currentQuantity * p.sellingPrice, 0);
  const totalStock = products.reduce((s, p) => s + p.currentQuantity, 0);
  const lowCount = products.filter((p) => p.currentQuantity > 0 && p.currentQuantity <= p.lowStockLimit).length;
  const outCount = products.filter((p) => p.currentQuantity === 0).length;

  const stats = [
    { label: 'Total Stock Units', value: formatNumber(totalStock), icon: Warehouse, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/30' },
    { label: 'Inventory Cost Value', value: formatCurrency(totalValue), icon: Warehouse, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    { label: 'Retail Value', value: formatCurrency(totalRetail), icon: Warehouse, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { label: 'Low Stock / Out', value: `${lowCount} / ${outCount}`, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/30' },
  ];

  return (
    <div className="space-y-6 animate-slide-in">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Inventory</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl p-5 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', s.bg)}><s.icon className={cn('w-4 h-4', s.color)} /></div>
            </div>
            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <input type="text" placeholder="Search inventory..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        </div>
        <div className="flex gap-2">
          {(['all', 'healthy', 'low', 'out'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-3 py-2 rounded-lg text-sm font-medium transition-colors', filter === f ? 'bg-brand-600 text-white' : 'border')}
              style={filter !== f ? { borderColor: 'var(--border)', color: 'var(--text-primary)' } : {}}>
              {f === 'all' ? 'All' : f === 'healthy' ? 'Healthy' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        {loading ? (
          <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  {['Product', 'Category', 'Starting', 'Current', 'Sold', 'Status', 'Stock Value', 'Retail Value'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const stock = getStockStatus(p.currentQuantity, p.lowStockLimit);
                  const sold = p.startingQuantity - p.currentQuantity;
                  const pct = p.startingQuantity > 0 ? (p.currentQuantity / p.startingQuantity) * 100 : 0;
                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/50" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{p.category || '—'}</td>
                      <td className="px-4 py-3 text-center" style={{ color: 'var(--text-primary)' }}>{formatNumber(p.startingQuantity)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                            <div className={cn('h-full rounded-full', pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatNumber(p.currentQuantity)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-emerald-600 font-medium">{sold > 0 ? sold : 0}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1">
                          {stock.color === 'green' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : stock.color === 'yellow' ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                          <span className={cn('text-xs font-medium', stock.color === 'green' ? 'text-emerald-600' : stock.color === 'yellow' ? 'text-amber-600' : 'text-red-600')}>{stock.label}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: 'var(--text-primary)' }}>{formatCurrency(p.currentQuantity * p.costPrice)}</td>
                      <td className="px-4 py-3 text-right font-medium text-brand-600">{formatCurrency(p.currentQuantity * p.sellingPrice)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
