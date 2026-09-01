'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Calendar, ChevronLeft, ChevronRight, ArrowUpDown, History } from 'lucide-react';
import { formatCurrency, formatNumber, formatDate, cn } from '@/lib/utils';

interface Movement {
  id: string; productId: string; previousQuantity: number; newQuantity: number;
  quantityDiff: number; estimatedRevenue: number; estimatedProfit: number;
  createdAt: string;
  product: { name: string; image: string | null; sku: string | null; category: string | null };
}

export default function HistoryPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('createdAt');
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');
  const limit = 20;

  const fetchMovements = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), sort, order });
    if (search) params.set('search', search);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    try {
      const res = await fetch(`/api/movements?${params}`);
      const json = await res.json();
      setMovements(json.movements);
      setTotal(json.total);
    } finally {
      setLoading(false);
    }
  }, [page, search, from, to, sort, order]);

  useEffect(() => { fetchMovements(); }, [fetchMovements]);

  const toggleSort = (field: string) => {
    if (sort === field) setOrder(order === 'desc' ? 'asc' : 'desc');
    else { setSort(field); setOrder('desc'); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Sales History</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Quantity movement records</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <input type="text" placeholder="Search by product..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }}
              className="pl-10 pr-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }}
              className="pl-10 pr-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : movements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <History className="w-12 h-12 mb-3" style={{ color: 'var(--text-secondary)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No quantity movements found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  {[
                    { key: 'createdAt', label: 'Date & Time' },
                    { key: 'product', label: 'Product' },
                    { key: 'previousQuantity', label: 'Previous Qty' },
                    { key: 'newQuantity', label: 'New Qty' },
                    { key: 'quantityDiff', label: 'Difference' },
                    { key: 'estimatedRevenue', label: 'Est. Revenue' },
                    { key: 'estimatedProfit', label: 'Est. Profit' },
                  ].map((col) => (
                    <th key={col.key}
                      onClick={() => col.key !== 'product' && toggleSort(col.key)}
                      className={cn('px-4 py-3 text-left font-medium whitespace-nowrap', col.key !== 'product' && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800')}
                      style={{ color: 'var(--text-secondary)' }}>
                      <span className="flex items-center gap-1">
                        {col.label}
                        {col.key !== 'product' && <ArrowUpDown className="w-3 h-3" />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{formatDate(m.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{m.product.name}</p>
                        {m.product.sku && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{m.product.sku}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center" style={{ color: 'var(--text-primary)' }}>{formatNumber(m.previousQuantity)}</td>
                    <td className="px-4 py-3 text-center" style={{ color: 'var(--text-primary)' }}>{formatNumber(m.newQuantity)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('font-semibold', m.quantityDiff > 0 ? 'text-emerald-600' : 'text-amber-600')}>
                        {m.quantityDiff > 0 ? `-${m.quantityDiff}` : `+${Math.abs(m.quantityDiff)}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">{formatCurrency(m.estimatedRevenue)}</td>
                    <td className="px-4 py-3 text-right font-medium text-purple-600">{formatCurrency(m.estimatedProfit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}</p>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-2 rounded-lg border disabled:opacity-40" style={{ borderColor: 'var(--border)' }}><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm px-2" style={{ color: 'var(--text-secondary)' }}>{page}/{totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="p-2 rounded-lg border disabled:opacity-40" style={{ borderColor: 'var(--border)' }}><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
