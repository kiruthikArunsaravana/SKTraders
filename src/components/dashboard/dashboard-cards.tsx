'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Receipt, TrendingUp, Ship } from 'lucide-react';
import { getDashboardKpiData } from '@/app/dashboard/actions';
import { useEffect, useState } from 'react';

const initialKpiData = {
  totalRevenue: 0,
  totalExpenses: 0,
  netProfit: 0,
  revenueChange: 0,
  expensesChange: 0,
  topProduct: { name: 'N/A', unitsSold: 0 },
  totalExportValue: 0,
};

function formatChange(change: number) {
    if (change === 0) return 'No change from last month';
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}% from last month`;
}

export default function DashboardCards() {
  const [kpiData, setKpiData] = useState(initialKpiData);

  useEffect(() => {
    getDashboardKpiData().then(setKpiData);
  }, []);

  const cards = [
    {
      title: 'Total Revenue',
      value: `$${kpiData.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: formatChange(kpiData.revenueChange),
      icon: DollarSign,
    },
    {
      title: 'Total Expenses',
      value: `$${kpiData.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: formatChange(kpiData.expensesChange),
      icon: Receipt,
    },
    {
      title: 'Top Product',
      value: kpiData.topProduct.name,
      change: `${kpiData.topProduct.unitsSold} units sold this month`,
      icon: TrendingUp,
    },
    {
      title: 'Export Value',
      value: `$${kpiData.totalExportValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: 'In the current month',
      icon: Ship,
    },
  ];

  return (
    <>
      {cards.map((kpi) => (
        <Card key={kpi.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
            <kpi.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <p className="text-xs text-muted-foreground">{kpi.change}</p>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
