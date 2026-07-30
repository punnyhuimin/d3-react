import { PercentByCategoryChart } from '@/features/percent-by-category/PercentByCategoryChart';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import styles from '@/pages/app.module.css';

export function App() {
  return (
    <main className={styles.page}>
      <div className={styles.column}>
        <header className={styles.header}>
          <h1 className={styles.title}>Percent value vs category</h1>
          <ThemeToggle />
        </header>
        <PercentByCategoryChart />
      </div>
    </main>
  );
}
