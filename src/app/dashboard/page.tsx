import DashboardCards from '@/components/dashboard/dashboard-cards';
import SalesChart from '@/components/dashboard/sales-chart';
import RecentTransactions from '@/components/dashboard/recent-transactions';

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-8">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <DashboardCards />
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <SalesChart />
        <RecentTransactions />
      </div>
    </div>
  );
}
