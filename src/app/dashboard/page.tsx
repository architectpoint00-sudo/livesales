'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Package, TrendingUp, DollarSign, BarChart3, AlertTriangle,
  ArrowDown, ArrowUp, Activity,
} from 'lucide-react';
import { formatCurrency, formatNumber, formatDate, cn } from '@/lib/utils';

interface DashboardData {
  totalTracking: number;
  totalSold: number;
  remainingInventory: number;
  totalRevenue: number;
  totalProfit: number;
  lowStockProducts: { id: string; name: string; current: number; limit: number }[];
  bestSellers: { id: string; name: string; unitsSold: number; revenue: number }[];
  recentMovements: {
    id: string; productName: string; previousQuantity: number;
    newQuantity: number; quantityDiff: number; estimatedRevenue: number; createdAt: string;
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) return <DashboardSkeleton />;
  if (!data) return <p>Failed to load dashboard</p>;

  const stats = [
    { label: 'Products Tracking', value: formatNumber(data.totalTracking), icon: Package, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/30' },
    { label: 'Total Quantity Sold', value: formatNumber(data.totalSold), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { label: 'Estimated Revenue', value: formatCurrency(data.totalRevenue), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    { label: 'Estimated Profit', value: formatCurrency(data.totalProfit), icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/30' },
    { label: 'Remaining Inventory', value: formatNumber(data.remainingInventory), icon: Package, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/30' },
    { label: 'Low Stock Alerts', value: formatNumber(data.lowStockProducts.length), icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/30' },
  ];

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Real-time quantity analytics overview</p>
        </div>
        <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot" />
          Live
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl p-5 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', s.bg)}>
                <s.icon className={cn('w-5 h-5', s.color)} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-brand-500" />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Live Inventory Activity</h2>
          </div>
          {data.recentMovements.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--text-secondary)' }}>No quantity movements yet</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
              {data.recentMovements.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <div className={cn('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0', m.quantityDiff > 0 ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-amber-100 dark:bg-amber-900/40')}>
                    {m.quantityDiff > 0 ? <ArrowDown className="w-4 h-4 text-emerald-600" /> : <ArrowUp className="w-4 h-4 text-amber-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{m.productName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {m.previousQuantity} → {m.newQuantity} &middot; {m.quantityDiff > 0 ? `${m.quantityDiff} sold` : `${Math.abs(m.quantityDiff)} restocked`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {m.quantityDiff > 0 && <p className="text-sm font-semibold text-emerald-600">{formatCurrency(m.estimatedRevenue)}</p>}
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDate(m.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Best Sellers</h2>
            {data.bestSellers.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--text-secondary)' }}>No sales data yet</p>
            ) : (
              <div className="space-y-3">
                {data.bestSellers.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0', i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : 'bg-amber-700')}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatNumber(p.unitsSold)} units sold</p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-600">{formatCurrency(p.revenue)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Low Stock Alerts</h2>
            </div>
            {data.lowStockProducts.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--text-secondary)' }}>All stock levels are healthy</p>
            ) : (
              <div className="space-y-2">
                {data.lowStockProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                    <span className={cn('text-xs font-semibold px-2 py-1 rounded-full', p.current === 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300')}>
                      {p.current} left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl p-5 border animate-pulse" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700 mb-4" />
            <div className="h-8 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}
