import ReportGenerator from '@/components/reports/report-generator';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline">Financial Reports</h1>
      </div>
      <ReportGenerator />
    </div>
  );
}
