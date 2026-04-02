import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Shield } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function AuditPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["/audit-logs", search],
    queryFn: () => apiFetch<any[]>(`/audit-logs?entity=${search}`),
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE": return <Badge className="bg-green-500">CREATE</Badge>;
      case "UPDATE": return <Badge className="bg-blue-500">UPDATE</Badge>;
      case "DELETE": return <Badge variant="destructive">DELETE</Badge>;
      case "LOGIN": return <Badge className="bg-purple-500">LOGIN</Badge>;
      default: return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("audit.title")}</h1>
          <p className="text-muted-foreground">{t("audit.traceSubtitle")}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={t("audit.searchPlaceholder")} 
            className="pl-10" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
      </div>

      <div className="bg-white border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("audit.user")}</TableHead>
              <TableHead>{t("audit.action")}</TableHead>
              <TableHead>{t("audit.entity")}</TableHead>
              <TableHead>{t("audit.entityId")}</TableHead>
              <TableHead>{t("audit.ipAddress")}</TableHead>
              <TableHead>{t("audit.timestamp")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs?.map(log => (
              <TableRow key={log.id}>
                <TableCell>
                  <div className="font-medium">{log.userName || t("audit.system")}</div>
                </TableCell>
                <TableCell>{getActionBadge(log.action)}</TableCell>
                <TableCell><span className="font-mono text-xs">{log.entity}</span></TableCell>
                <TableCell><span className="font-mono text-[10px] text-muted-foreground">{log.entityId}</span></TableCell>
                <TableCell className="text-xs">{log.ipAddress || "-"}</TableCell>
                <TableCell className="text-xs">{formatDateTime(log.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
