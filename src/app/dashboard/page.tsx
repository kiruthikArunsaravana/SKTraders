import DashboardCards from '@/components/dashboard/dashboard-cards';

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCards />
      </div>
    </div>
  );
}
