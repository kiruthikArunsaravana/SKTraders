import DashboardCards from '@/components/dashboard/dashboard-cards';
import RecentTransactions from '@/components/dashboard/recent-transactions';
import SalesPerformance from '@/components/dashboard/sales-performance';

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-8">
      <DashboardCards />
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SalesPerformance />
        </div>
        <RecentTransactions />
      </div>
    </div>
  );
}
