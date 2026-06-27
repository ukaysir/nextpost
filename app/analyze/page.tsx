import { AnalyzeForm } from "@/components/analyze-form";
import { AuthGuard } from "@/components/auth-guard";

export default function AnalyzePage() {
  return (
    <AuthGuard>
      <AnalyzeForm />
    </AuthGuard>
  );
}
