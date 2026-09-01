'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatCurrency, formatNumber, formatShortDate } from '@/lib/utils';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, DollarSign, Package, BarChart3 } from 'lucide-react';

interface AnalyticsData {
  dailyRevenue: { date: string; revenue: number; profit: number; units: number }[];
  categoryPerformance: { category: string; units: number; revenue: number }[];
  productPerformance: { name: string; units: number; revenue: number; profit: number }[];
  inventoryValue: number;
  retailValue: number;
  totalMovements: number;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const ranges = [
  { label: '7 Days', value: '7' },
  { label: '30 Days', value: '30' },
  { label: '90 Days', value: '90' },
  { label: 'All Time', value: '365' },
];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (customFrom && customTo) {
        params.set('from', customFrom);
        params.set('to', customTo);
      } else {
        params.set('range', range);
      }
      const res = await fetch(`/api/analytics?${params}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [range, customFrom, customTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 border h-80 animate-pulse" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }} />
          ))}
        </div>
      </div>
    );
  }

  const totalRevenue = data.dailyRevenue.reduce((s, d) => s + d.revenue, 0);
  const totalProfit = data.dailyRevenue.reduce((s, d) => s + d.profit, 0);
  const totalUnits = data.dailyRevenue.reduce((s, d) => s + d.units, 0);

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Performance metrics and trends</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {ranges.map((r) => (
            <button key={r.value} onClick={() => { setRange(r.value); setCustomFrom(''); setCustomTo(''); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${range === r.value && !customFrom ? 'bg-brand-600 text-white' : 'border hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              style={range !== r.value || customFrom ? { borderColor: 'var(--border)', color: 'var(--text-primary)' } : {}}>
              {r.label}
            </button>
          ))}
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
            className="px-2 py-1.5 rounded-lg border text-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
            className="px-2 py-1.5 rounded-lg border text-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Revenue', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
          { label: 'Profit', value: formatCurrency(totalProfit), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30' },
          { label: 'Units Sold', value: formatNumber(totalUnits), icon: Package, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/30' },
          { label: 'Inventory Value', value: formatCurrency(data.inventoryValue), icon: BarChart3, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/30' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-5 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.bg}`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
            </div>
            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Revenue & Profit Trend">
          {data.dailyRevenue.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tickFormatter={(d) => formatShortDate(d)} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => formatShortDate(l)} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={false} name="Revenue" />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} dot={false} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Units Sold by Day">
          {data.dailyRevenue.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tickFormatter={(d) => formatShortDate(d)} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                  labelFormatter={(l) => formatShortDate(l)} />
                <Bar dataKey="units" fill="#6366f1" radius={[4, 4, 0, 0]} name="Units Sold" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Category Performance">
          {data.categoryPerformance.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data.categoryPerformance} dataKey="revenue" nameKey="category" cx="50%" cy="50%"
                  outerRadius={100} label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {data.categoryPerformance.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Top Products">
          {data.productPerformance.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.productPerformance.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="units" fill="#10b981" radius={[0, 4, 4, 0]} name="Units" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      {children}
    </div>
  );
}

function EmptyChart() {
  return <p className="text-sm text-center py-20" style={{ color: 'var(--text-secondary)' }}>No data for this period</p>;
}
