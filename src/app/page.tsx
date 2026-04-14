import { SiteShell } from "@/components/site-shell";
import { TransferComposer } from "@/components/transfer-composer";
import styles from "@/components/sharesharp.module.css";

export default function Home() {
  return (
    <SiteShell>
      <div className={styles.centeredCard}>
        <div className={styles.cardHeader}>
          <h1 className={styles.cardTitle}><em>Leave</em> the<br />package.</h1>
          <p className={styles.cardSubtitle}>
            One file. One link. Self-destructs on schedule.
          </p>
        </div>
        <TransferComposer />
      </div>
    </SiteShell>
  );
}
