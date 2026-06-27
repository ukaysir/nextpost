import { AuthGuard } from "@/components/auth-guard";
import { ResultsDashboard } from "@/components/results-dashboard";

export default function ResultsPage() {
  return (
    <AuthGuard>
      <ResultsDashboard />
    </AuthGuard>
  );
}
