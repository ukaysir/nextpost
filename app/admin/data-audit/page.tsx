import { AdminDataAudit } from "@/components/admin-data-audit";
import { AuthGuard } from "@/components/auth-guard";

export default function AdminDataAuditPage() {
  return (
    <AuthGuard>
      <AdminDataAudit />
    </AuthGuard>
  );
}
