import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Receipt, TrendingUp, Ship } from 'lucide-react';

const kpiData = [
  {
    title: 'Total Revenue',
    value: '$45,231.89',
    change: '+20.1% from last month',
    icon: DollarSign,
  },
  {
    title: 'Total Expenses',
    value: '$12,873.45',
    change: '+18.1% from last month',
    icon: Receipt,
  },
  {
    title: 'Top Product',
    value: 'Coir Fiber',
    change: '5,231 units sold',
    icon: TrendingUp,
  },
  {
    title: 'Export Volume',
    value: '234 Tons',
    change: '+19% from last month',
    icon: Ship,
  },
];

export default function DashboardCards() {
  return (
    <>
      {kpiData.map((kpi) => (
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
