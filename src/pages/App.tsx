import { PercentByCategoryChart } from '@/features/percent-by-category/PercentByCategoryChart';
import styles from '@/pages/app.module.css';

export function App() {
  return (
    <main className={styles.page}>
      <div className={styles.column}>
        <header className={styles.header}>
          <h1 className={styles.title}>Percent value vs category</h1>
          <p className={styles.subtitle}>
            Every figure below is derived from the source dataset at runtime.
          </p>
        </header>
        <PercentByCategoryChart />
      </div>
    </main>
  );
}
