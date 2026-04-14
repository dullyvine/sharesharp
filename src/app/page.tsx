import { SiteShell } from "@/components/site-shell";
import { TransferComposer } from "@/components/transfer-composer";

export default function Home() {
  return (
    <SiteShell
      panelTitle="New transfer"
      panelCaption="Pick an expiry. Get a link."
    >
      <TransferComposer />
    </SiteShell>
  );
}
