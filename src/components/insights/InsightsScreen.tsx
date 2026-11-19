// AURIX - Primary Screen 4: Spending Insights & AI (Based on Reference Design Phone 4)
import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Sparkles,
  Download,
  TrendingDown,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Search,
  Layers,
  ChevronDown,
  ChevronUp,
  Tag,
  Calendar,
  Wallet,
  ArrowRight,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { AIAssistantChat } from './AIAssistantChat';
import { CategoryIcon } from '../common/CategoryIcon';
import { useFinancial } from '../../context/FinancialContext';
import { formatPaise, toRupees } from '../../engine/currency';
import { AccountingEngine } from '../../engine/accountingEngine';
import { AIInsightsService } from '../../services/aiInsightsService';
import { ExportService } from '../../services/exportService';

export const InsightsScreen: React.FC = () => {
  const {
    currentMonth,
    accounts,
    transactions,
    categories,
    monthlyBudget,
    categoryBudgets,
  } = useFinancial();

  const [activeChartTab, setActiveChartTab] = useState<'categories' | 'daily'>('categories');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'active' | 'zero'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'spend' | 'name' | 'txns'>('spend');
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  // Ledger and category calculation
  const ledger = AccountingEngine.calculateMonthlyLedger(
    currentMonth,
    accounts,
    transactions,
    monthlyBudget?.total_limit_paise || 0
  );

  const categorySpending = AccountingEngine.getCategorySpending(currentMonth, transactions);

  // Compute AI insights
  const aiInsights = AIInsightsService.generateInsights(
    currentMonth,
    accounts,
    transactions,
    categories,
    monthlyBudget
  );

  // Format month name
  const formatMonthName = (mStr: string) => {
    const [y, m] = mStr.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  // Month expense transactions
  const monthTxns = useMemo(() => {
    return transactions.filter(
      (t) => !t.is_deleted && t.type === 'expense' && t.date.startsWith(currentMonth)
    );
  }, [transactions, currentMonth]);

  // All Expense Categories with Complete Metrics (Active and Zero-Spend)
  const expenseCategories = useMemo(() => {
    return categories.filter((c) => c.type === 'expense');
  }, [categories]);

  const categoryMatrix = useMemo(() => {
    return expenseCategories.map((cat) => {
      const spentPaise = categorySpending[cat.id] || 0;
      const catTxns = monthTxns.filter((t) => t.category_id === cat.id);
      const budgetObj = categoryBudgets?.find((b) => b.category_id === cat.id);
      const allocatedPaise = budgetObj?.allocated_paise || 0;
      const percentOfTotal =
        ledger.total_expenses_paise > 0
          ? (spentPaise / ledger.total_expenses_paise) * 100
          : 0;

      return {
        ...cat,
        spentPaise,
        amount: toRupees(spentPaise),
        txnCount: catTxns.length,
        allocatedPaise,
        percentOfTotal,
        transactions: catTxns,
      };
    });
  }, [expenseCategories, categorySpending, monthTxns, categoryBudgets, ledger.total_expenses_paise]);

  // Counts for tabs
  const activeCount = useMemo(() => categoryMatrix.filter((c) => c.spentPaise > 0).length, [categoryMatrix]);
  const zeroCount = useMemo(() => categoryMatrix.filter((c) => c.spentPaise === 0).length, [categoryMatrix]);

  // Filtered & Sorted Category Matrix
  const filteredCategoryMatrix = useMemo(() => {
    let result = categoryMatrix;

    if (categoryFilter === 'active') {
      result = result.filter((c) => c.spentPaise > 0);
    } else if (categoryFilter === 'zero') {
      result = result.filter((c) => c.spentPaise === 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }

    return [...result].sort((a, b) => {
      if (sortBy === 'spend') {
        if (b.spentPaise !== a.spentPaise) return b.spentPaise - a.spentPaise;
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'txns') {
        if (b.txnCount !== a.txnCount) return b.txnCount - a.txnCount;
        return b.spentPaise - a.spentPaise;
      }
      return 0;
    });
  }, [categoryMatrix, categoryFilter, searchQuery, sortBy]);

  // Prepare Category Bar Data (Active Spends for Top Chart)
  const categoryData = useMemo(() => {
    return categoryMatrix
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [categoryMatrix]);

  // Prepare Daily Spending Data for current month
  const dailyData = useMemo(() => {
    const dailyMap: Record<string, number> = {};
    for (const t of monthTxns) {
      const day = t.date.slice(8);
      dailyMap[day] = (dailyMap[day] || 0) + toRupees(t.amount_paise);
    }
    return Object.keys(dailyMap)
      .sort()
      .map((day) => ({
        day: `${parseInt(day)}th`,
        amount: dailyMap[day],
      }));
  }, [monthTxns]);

  // Account lookup helper
  const getAccountName = (accId: string) => {
    return accounts.find((a) => a.id === accId)?.name || 'Account';
  };

  // Export Handlers
  const handleExportCSV = () => {
    ExportService.exportTransactionsCSV(transactions, accounts, categories);
  };

  const handleExportPDF = () => {
    ExportService.exportFinancialStatementPDF(currentMonth, transactions, accounts, categories);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 pb-24 md:pb-12">
      {/* Left Column: Spending Analytics Chart, Category Ledger Matrix & AI Cards */}
      <div className="lg:col-span-7 space-y-4 sm:space-y-5">
        {/* 1. Header Card with Monthly Expenditure Hero & Chart */}
        <Card className="p-5 bg-gradient-to-br from-[#1C2019] via-[#151812] to-[#1C2019] border-[#30352B] rounded-[26px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-[#E7FF32] shadow-[0_0_8px_#E7FF32]" />
              <span className="text-xs uppercase font-semibold text-[#A1A69A] tracking-wider">
                Spending Analytics ({formatMonthName(currentMonth)})
              </span>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={handleExportCSV}
                className="p-1.5 rounded-lg bg-[#23281F] text-[#A1A69A] hover:text-[#E7FF32] border border-[#30352B] text-xs transition-colors"
                title="Download CSV"
              >
                CSV
              </button>
              <button
                onClick={handleExportPDF}
                className="p-1.5 rounded-lg bg-[#23281F] text-[#A1A69A] hover:text-[#E7FF32] border border-[#30352B] text-xs transition-colors"
                title="Download PDF Statement"
              >
                PDF
              </button>
            </div>
          </div>

          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#FF6868] num-tabular">
              {formatPaise(ledger.total_expenses_paise)}
            </div>
            <div className="text-xs text-[#A1A69A] mt-1">
              Income: <span className="text-[#A8E66A] font-medium num-tabular">{formatPaise(ledger.total_income_paise)}</span>
              {' '}•{' '}
              Net Savings: <span className="text-white font-medium num-tabular">{formatPaise(ledger.net_savings_paise, { showSign: true })}</span>
            </div>
          </div>

          {/* Chart View Toggle Tabs */}
          <div className="flex items-center space-x-2 mt-4 pt-3 border-t border-[#30352B]/60">
            <button
              onClick={() => setActiveChartTab('categories')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeChartTab === 'categories'
                  ? 'bg-[#E7FF32] text-[#090B08]'
                  : 'bg-[#23281F] text-[#A1A69A] hover:text-white'
              }`}
            >
              Category Breakdown ({activeCount} Active)
            </button>
            <button
              onClick={() => setActiveChartTab('daily')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeChartTab === 'daily'
                  ? 'bg-[#E7FF32] text-[#090B08]'
                  : 'bg-[#23281F] text-[#A1A69A] hover:text-white'
              }`}
            >
              Daily Velocity
            </button>
          </div>

          {/* Visual Chart */}
          <div className="h-64 sm:h-72 mt-4 w-full">
            {activeChartTab === 'categories' ? (
              categoryData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-[#A1A69A]">
                  No expense data recorded for this month
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#A1A69A"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={90}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="p-2 bg-[#090B08] border border-[#30352B] rounded-lg text-xs">
                              <span className="font-bold text-white">{data.name}</span>: ₹{Number(data.amount).toFixed(2)} ({data.percentOfTotal.toFixed(1)}%)
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#E7FF32'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )
            ) : dailyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#A1A69A]">
                No daily expenses recorded for this month
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <XAxis dataKey="day" stroke="#A1A69A" fontSize={10} tickLine={false} />
                  <YAxis stroke="#A1A69A" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="p-2 bg-[#090B08] border border-[#30352B] rounded-lg text-xs">
                            <span className="font-bold text-[#E7FF32]">₹{Number(payload[0].value).toFixed(2)}</span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="amount" fill="#E7FF32" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* 2. All Categories Expenditure Ledger & Matrix */}
        <Card className="p-5 bg-[#151812] border-[#30352B] rounded-[26px] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-3 border-b border-[#30352B]/60">
            <div>
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#E7FF32]" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  All Categories Expenditure Ledger
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E7FF32]/10 text-[#E7FF32] border border-[#E7FF32]/30">
                  {expenseCategories.length} Categories
                </span>
              </div>
              <p className="text-xs text-[#A1A69A] mt-0.5">
                Audit every single category's monthly spend, allocation, and transactions
              </p>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-1.5 self-start sm:self-auto">
              <span className="text-[11px] text-[#A1A69A]">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#1C2019] text-xs text-white border border-[#30352B] rounded-lg px-2 py-1 focus:outline-none focus:border-[#E7FF32]"
              >
                <option value="spend">Highest Spend</option>
                <option value="name">Name (A-Z)</option>
                <option value="txns">Most Transactions</option>
              </select>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="mt-3.5 space-y-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#A1A69A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search categories (e.g. Friend, Lending Money, Food, Fuel...)"
                className="w-full bg-[#1C2019] border border-[#30352B] focus:border-[#E7FF32] rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-[#A1A69A]/60 focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#A1A69A] hover:text-white"
                >
                  ×
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  categoryFilter === 'all'
                    ? 'bg-[#E7FF32] text-[#090B08] font-bold shadow-sm'
                    : 'bg-[#1C2019] text-[#A1A69A] hover:text-white border border-[#30352B]'
                }`}
              >
                All Categories ({expenseCategories.length})
              </button>
              <button
                onClick={() => setCategoryFilter('active')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  categoryFilter === 'active'
                    ? 'bg-[#FF6868] text-[#090B08] font-bold shadow-sm'
                    : 'bg-[#1C2019] text-[#A1A69A] hover:text-white border border-[#30352B]'
                }`}
              >
                Active This Month ({activeCount})
              </button>
              <button
                onClick={() => setCategoryFilter('zero')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  categoryFilter === 'zero'
                    ? 'bg-[#38BDF8] text-[#090B08] font-bold shadow-sm'
                    : 'bg-[#1C2019] text-[#A1A69A] hover:text-white border border-[#30352B]'
                }`}
              >
                Zero Spend ({zeroCount})
              </button>
            </div>
          </div>

          {/* Category List Matrix */}
          <div className="mt-3.5 space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {filteredCategoryMatrix.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#A1A69A]">
                No categories match your search "{searchQuery}"
              </div>
            ) : (
              filteredCategoryMatrix.map((cat) => {
                const isExpanded = expandedCategoryId === cat.id;
                const hasSpend = cat.spentPaise > 0;

                return (
                  <div
                    key={cat.id}
                    className={`rounded-2xl border transition-all ${
                      hasSpend
                        ? 'bg-[#1C2019] border-[#30352B] hover:border-[#E7FF32]/40'
                        : 'bg-[#181C15] border-[#252920] opacity-80 hover:opacity-100'
                    }`}
                  >
                    {/* Main Row */}
                    <div
                      onClick={() => setExpandedCategoryId(isExpanded ? null : cat.id)}
                      className="p-3 flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <CategoryIcon name={cat.icon} color={cat.color} size={18} />
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-white truncate">
                              {cat.name}
                            </span>
                            {/* Special pill for newly requested categories */}
                            {(cat.name === 'Friend' || cat.name === 'Lending Money') && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
                                Tracked
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#A1A69A] mt-0.5 truncate">
                            {hasSpend ? (
                              <span>
                                {cat.txnCount} txn{cat.txnCount === 1 ? '' : 's'} •{' '}
                                <span className="text-[#E7FF32] font-medium">
                                  {cat.percentOfTotal.toFixed(1)}% of total
                                </span>
                              </span>
                            ) : (
                              <span>No spends recorded this month</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Spend Amount & Expand Indicator */}
                      <div className="flex items-center space-x-3 shrink-0">
                        <div className="text-right">
                          <div
                            className={`text-xs font-bold num-tabular ${
                              hasSpend ? 'text-[#FF6868]' : 'text-[#A1A69A]'
                            }`}
                          >
                            {formatPaise(cat.spentPaise)}
                          </div>
                          {cat.allocatedPaise > 0 && (
                            <div className="text-[10px] text-[#A1A69A] num-tabular">
                              Limit: {formatPaise(cat.allocatedPaise)}
                            </div>
                          )}
                        </div>

                        <div className="text-[#A1A69A] hover:text-white">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Spend Proportion Progress Bar */}
                    <div className="px-3 pb-2.5">
                      <div className="w-full h-1.5 bg-[#090B08] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.max(hasSpend ? 2 : 0, cat.percentOfTotal))}%`,
                            backgroundColor: cat.color || '#E7FF32',
                          }}
                        />
                      </div>
                    </div>

                    {/* Expanded Transactions Drawer */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-[#30352B]/60 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-[#A1A69A] mb-2">
                          <span>Transactions in {cat.name} ({cat.transactions.length})</span>
                          <span className="text-[10px] text-[#E7FF32]">
                            Total: {formatPaise(cat.spentPaise)}
                          </span>
                        </div>

                        {cat.transactions.length === 0 ? (
                          <div className="p-3 rounded-xl bg-[#090B08] text-center text-xs text-[#A1A69A]">
                            No transactions recorded for {cat.name} in {formatMonthName(currentMonth)} yet.
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {cat.transactions.map((t) => (
                              <div
                                key={t.id}
                                className="flex items-center justify-between p-2 rounded-xl bg-[#090B08] border border-[#30352B]/70 text-xs"
                              >
                                <div className="min-w-0 mr-2">
                                  <div className="text-white font-medium truncate">
                                    {t.description || cat.name}
                                  </div>
                                  <div className="text-[10px] text-[#A1A69A] flex items-center space-x-1.5 mt-0.5">
                                    <span>{t.date}</span>
                                    <span>•</span>
                                    <span>{getAccountName(t.account_id)}</span>
                                    <span>•</span>
                                    <span className="uppercase">{t.payment_method}</span>
                                  </div>
                                </div>
                                <div className="font-bold text-[#FF6868] num-tabular shrink-0">
                                  -{formatPaise(t.amount_paise)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* 3. Automated AI Insights Cards */}
        <div className="space-y-2.5">
          <div className="flex items-center space-x-1.5 px-1">
            <Sparkles className="w-3.5 h-3.5 text-[#E7FF32]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Deterministic AI Analysis
            </h3>
          </div>

          {aiInsights.map((insight) => (
            <div
              key={insight.id}
              className={`p-4 rounded-2xl border transition-all ${
                insight.type === 'warning' || insight.type === 'anomaly'
                  ? 'bg-[#1C2019] border-[#FF6868]/40'
                  : insight.type === 'health'
                  ? 'bg-[#1C2019] border-[#E7FF32]/40'
                  : 'bg-[#1C2019] border-[#30352B]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">{insight.title}</h4>
                  <p className="text-xs text-[#A1A69A] mt-1 leading-relaxed">
                    {insight.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: AI Assistant Chat Box */}
      <div className="lg:col-span-5 space-y-4 sm:space-y-5">
        <AIAssistantChat />
      </div>
    </div>
  );
};

