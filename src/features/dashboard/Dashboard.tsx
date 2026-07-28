import { BarChart, type BarChartDatum } from '@/components/BarChart';

const sampleData: BarChartDatum[] = [
  { label: 'A', value: 12 },
  { label: 'B', value: 28 },
  { label: 'C', value: 19 },
  { label: 'D', value: 34 },
  { label: 'E', value: 9 },
];

export function Dashboard() {
  return (
    <section>
      <h2>Dashboard</h2>
      <BarChart data={sampleData} />
    </section>
  );
}
