import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  startOfDay, startOfWeek, startOfMonth, startOfYear,
  subDays, subWeeks, subMonths, subYears,
  format, eachDayOfInterval, isWithinInterval,
} from "date-fns";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend, Area, AreaChart,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, Calendar as CalendarIcon, PiggyBank, Target } from "lucide-react";
import { useExpenses, useCategories, useProfile, useIncomes, useBudgets, formatCurrency, type Expense, type Income } from "@/hooks/use-tracker-data";


export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Neon Expense Tracker" }] }),
  component: Dashboard,
});

type Range = { start: Date; end: Date };

function sumInRange(expenses: Expense[], range: Range) {
  return expenses.reduce((acc, e) => {
    const d = new Date(e.spent_at);
    return isWithinInterval(d, { start: range.start, end: range.end }) ? acc + e.amount : acc;
  }, 0);
}

function sumIncomesInRange(incomes: Income[], range: Range) {
  return incomes.reduce((acc, e) => {
    const d = new Date(e.received_at);
    return isWithinInterval(d, { start: range.start, end: range.end }) ? acc + e.amount : acc;
  }, 0);
}


function deltaPct(current: number, prev: number) {
  if (prev === 0) return current === 0 ? 0 : 100;
  return ((current - prev) / prev) * 100;
}

function Dashboard() {
  const { data: expenses = [], isLoading } = useExpenses();
  const { data: incomes = [] } = useIncomes();
  const { data: categories = [] } = useCategories();
  const { data: profile } = useProfile();
  const { data: budgets = [] } = useBudgets();
  const currency = profile?.currency ?? "PKR";


  const now = new Date();
  const ranges = useMemo(() => {
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const yearStart = startOfYear(now);
    return {
      today: { start: todayStart, end: now },
      yesterday: { start: startOfDay(subDays(now, 1)), end: subDays(todayStart, 0) },
      thisWeek: { start: weekStart, end: now },
      lastWeek: { start: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), end: subDays(weekStart, 0) },
      thisMonth: { start: monthStart, end: now },
      lastMonth: { start: startOfMonth(subMonths(now, 1)), end: subDays(monthStart, 0) },
      thisYear: { start: yearStart, end: now },
      lastYear: { start: startOfYear(subYears(now, 1)), end: subDays(yearStart, 0) },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses]);

  const kpi = [
    { label: "Today", cur: sumInRange(expenses, ranges.today), prev: sumInRange(expenses, ranges.yesterday), color: "var(--neon-cyan)" },
    { label: "This Week", cur: sumInRange(expenses, ranges.thisWeek), prev: sumInRange(expenses, ranges.lastWeek), color: "var(--neon-magenta)" },
    { label: "This Month", cur: sumInRange(expenses, ranges.thisMonth), prev: sumInRange(expenses, ranges.lastMonth), color: "var(--neon-lime)" },
    { label: "This Year", cur: sumInRange(expenses, ranges.thisYear), prev: sumInRange(expenses, ranges.lastYear), color: "var(--neon-violet)" },
  ];

  // Daily line: last 30 days + previous 30 days overlay
  const daily = useMemo(() => {
    const end = startOfDay(now);
    const start = subDays(end, 29);
    const prevEnd = subDays(start, 1);
    const prevStart = subDays(prevEnd, 29);
    const days = eachDayOfInterval({ start, end });
    return days.map((d, i) => {
      const key = format(d, "yyyy-MM-dd");
      const prevKey = format(eachDayOfInterval({ start: prevStart, end: prevEnd })[i], "yyyy-MM-dd");
      const cur = expenses.filter((e) => e.spent_at === key).reduce((a, e) => a + e.amount, 0);
      const prev = expenses.filter((e) => e.spent_at === prevKey).reduce((a, e) => a + e.amount, 0);
      return { day: format(d, "MMM d"), current: cur, previous: prev };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses]);

  // Monthly: last 12 months vs prior 12 months
  const monthly = useMemo(() => {
    const months: { label: string; current: number; previous: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const m = subMonths(startOfMonth(now), i);
      const pm = subMonths(m, 12);
      const monthKey = format(m, "yyyy-MM");
      const prevMonthKey = format(pm, "yyyy-MM");
      const cur = expenses.filter((e) => e.spent_at.startsWith(monthKey)).reduce((a, e) => a + e.amount, 0);
      const prev = expenses.filter((e) => e.spent_at.startsWith(prevMonthKey)).reduce((a, e) => a + e.amount, 0);
      months.push({ label: format(m, "MMM"), current: cur, previous: prev });
    }
    return months;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses]);

  // Category breakdown for current month
  const byCategory = useMemo(() => {
    const monthKey = format(startOfMonth(now), "yyyy-MM");
    const map = new Map<string, number>();
    for (const e of expenses) {
      if (!e.spent_at.startsWith(monthKey)) continue;
      map.set(e.category_id, (map.get(e.category_id) ?? 0) + e.amount);
    }
    return categories
      .map((c) => ({ name: c.name, value: map.get(c.id) ?? 0, color: c.color }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, categories]);

  // Income vs Expense — monthly for last 12 months
  const incomeVsExpense = useMemo(() => {
    const arr: { label: string; income: number; expense: number; net: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const m = subMonths(startOfMonth(now), i);
      const key = format(m, "yyyy-MM");
      const inc = incomes.filter((x) => x.received_at.startsWith(key)).reduce((a, e) => a + e.amount, 0);
      const exp = expenses.filter((x) => x.spent_at.startsWith(key)).reduce((a, e) => a + e.amount, 0);
      arr.push({ label: format(m, "MMM"), income: inc, expense: exp, net: inc - exp });
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, incomes]);

  const thisMonthIncome = sumIncomesInRange(incomes, ranges.thisMonth);
  const thisMonthExpense = sumInRange(expenses, ranges.thisMonth);
  const net = thisMonthIncome - thisMonthExpense;
  const savingsRate = thisMonthIncome > 0 ? (net / thisMonthIncome) * 100 : 0;

  // Budget progress for current month
  const monthKeyNow = format(startOfMonth(now), "yyyy-MM");
  const spendByCat = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    for (const e of expenses) {
      if (!e.spent_at.startsWith(monthKeyNow)) continue;
      map.set(e.category_id, (map.get(e.category_id) ?? 0) + e.amount);
      total += e.amount;
    }
    return { map, total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses]);

  const budgetRows = budgets.map((b) => {
    const cat = b.category_id ? categories.find((c) => c.id === b.category_id) : null;
    const spent = b.category_id ? spendByCat.map.get(b.category_id) ?? 0 : spendByCat.total;
    const pct = b.amount > 0 ? Math.min(100, (spent / b.amount) * 100) : 0;
    const over = spent > b.amount && b.amount > 0;
    return {
      id: b.id,
      label: cat?.name ?? "Overall",
      color: cat?.color ?? "var(--neon-cyan)",
      amount: b.amount,
      spent,
      pct,
      over,
    };
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Live view of your spending, updated with every change.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpi.map((k) => {
          const d = deltaPct(k.cur, k.prev);
          const up = d > 0;
          return (
            <div key={k.label} className="neon-panel p-4 sm:p-5 relative overflow-hidden">
              <div
                className="absolute -top-10 -right-10 h-32 w-32 rounded-full blur-3xl opacity-30"
                style={{ background: k.color }}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="uppercase tracking-wider">{k.label}</span>
                <Wallet className="h-4 w-4" style={{ color: k.color }} />
              </div>
              <div className="mt-2 font-display text-2xl font-semibold" style={{ color: k.color, textShadow: `0 0 12px ${k.color}` }}>
                {formatCurrency(k.cur, currency)}
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs">
                {up ? (
                  <TrendingUp className="h-3.5 w-3.5 text-[color:var(--neon-magenta)]" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-[color:var(--neon-lime)]" />
                )}
                <span className={up ? "text-[color:var(--neon-magenta)]" : "text-[color:var(--neon-lime)]"}>
                  {Math.abs(d).toFixed(0)}%
                </span>
                <span className="text-muted-foreground">vs previous · {formatCurrency(k.prev, currency)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="neon-panel p-4 sm:p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Daily spend</h2>
              <p className="text-xs text-muted-foreground">Last 30 days vs previous 30 days</p>
            </div>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <filter id="glowCyan" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="b" />
                    <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} interval={4} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} width={50}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                <Tooltip
                  contentStyle={{ background: "rgba(20,22,45,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}
                  labelStyle={{ color: "#fff" }}
                  formatter={(v: number) => formatCurrency(v, currency)}
                />
                <Line type="monotone" dataKey="previous" stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} dot={false} />
                <Line
                  type="monotone" dataKey="current" stroke="var(--neon-cyan)" strokeWidth={2.5} dot={false}
                  filter="url(#glowCyan)" isAnimationActive
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="neon-panel p-4 sm:p-5">
          <h2 className="font-display text-lg font-semibold mb-1">By category</h2>
          <p className="text-xs text-muted-foreground mb-4">Current month breakdown</p>
          <div className="h-56">
            {byCategory.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No expenses this month yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3}>
                    {byCategory.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="rgba(0,0,0,0.3)" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "rgba(20,22,45,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#fff" }}
                    labelStyle={{ color: "#fff" }}
                    itemStyle={{ color: "#fff" }}
                    formatter={(v: number) => formatCurrency(v, currency)}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 space-y-1 max-h-32 overflow-auto">
            {byCategory.slice(0, 6).map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: c.color, boxShadow: `0 0 8px ${c.color}` }} />
                  <span>{c.name}</span>
                </div>
                <span className="text-muted-foreground">{formatCurrency(c.value, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="neon-panel p-4 sm:p-5">
          <h2 className="font-display text-lg font-semibold mb-1">Monthly comparison</h2>
          <p className="text-xs text-muted-foreground mb-4">Last 12 months vs prior 12 months</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gCur" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--neon-magenta)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--neon-magenta)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} width={50}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                <Tooltip
                  contentStyle={{ background: "rgba(20,22,45,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}
                  formatter={(v: number) => formatCurrency(v, currency)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="current" name="Current" stroke="var(--neon-magenta)" strokeWidth={2} fill="url(#gCur)" />
                <Area type="monotone" dataKey="previous" name="Previous" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="neon-panel p-4 sm:p-5">
          <h2 className="font-display text-lg font-semibold mb-1">Monthly totals</h2>
          <p className="text-xs text-muted-foreground mb-4">Bar view of the last 12 months</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} width={50}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                <Tooltip
                  contentStyle={{ background: "rgba(20,22,45,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}
                  formatter={(v: number) => formatCurrency(v, currency)}
                />
                <Bar dataKey="current" fill="var(--neon-lime)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Income vs Expense */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="neon-panel p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">This month</div>
              <div className="mt-1 text-xs">
                <span className="text-[color:var(--neon-lime)]">Income</span>{" "}
                <span className="font-display text-lg text-[color:var(--neon-lime)]" style={{ textShadow: "0 0 12px var(--neon-lime)" }}>
                  {formatCurrency(thisMonthIncome, currency)}
                </span>
              </div>
              <div className="mt-1 text-xs">
                <span className="text-[color:var(--neon-magenta)]">Expense</span>{" "}
                <span className="font-display text-lg text-[color:var(--neon-magenta)]" style={{ textShadow: "0 0 12px var(--neon-magenta)" }}>
                  {formatCurrency(thisMonthExpense, currency)}
                </span>
              </div>
            </div>
            <PiggyBank className="h-6 w-6 text-[color:var(--neon-cyan)]" />
          </div>
          <div className="mt-4 rounded-2xl bg-accent/30 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Net</span>
              <span
                className="font-display text-xl"
                style={{
                  color: net >= 0 ? "var(--neon-lime)" : "var(--neon-magenta)",
                  textShadow: `0 0 12px ${net >= 0 ? "var(--neon-lime)" : "var(--neon-magenta)"}`,
                }}
              >
                {formatCurrency(net, currency)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Savings rate</span>
              <span className={savingsRate >= 0 ? "text-[color:var(--neon-lime)]" : "text-[color:var(--neon-magenta)]"}>
                {savingsRate.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        <div className="neon-panel p-4 sm:p-5 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold mb-1">Income vs Expense</h2>
          <p className="text-xs text-muted-foreground mb-4">Last 12 months</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeVsExpense} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} width={50}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                <Tooltip
                  contentStyle={{ background: "rgba(20,22,45,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}
                  formatter={(v: number) => formatCurrency(v, currency)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="income" name="Income" fill="var(--neon-lime)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="var(--neon-magenta)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Budgets */}
      {budgetRows.length > 0 && (
        <div className="neon-panel p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Budgets</h2>
              <p className="text-xs text-muted-foreground">Progress against your monthly caps</p>
            </div>
            <Target className="h-4 w-4 text-[color:var(--neon-cyan)]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgetRows.map((b) => (
              <div key={b.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{b.label}</span>
                  <span className={b.over ? "text-[color:var(--neon-magenta)]" : "text-muted-foreground"}>
                    {formatCurrency(b.spent, currency)} / {formatCurrency(b.amount, currency)}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-accent/40 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${b.pct}%`,
                      background: b.over ? "var(--neon-magenta)" : b.color,
                      boxShadow: `0 0 12px ${b.over ? "var(--neon-magenta)" : b.color}`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}



      {isLoading && <div className="text-center text-sm text-muted-foreground">Loading…</div>}
    </div>
  );
}
