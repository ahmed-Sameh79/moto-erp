import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AreaChart, Area, PieChart, Pie, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend 
} from "recharts";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DollarSign, Wrench, Package, Bike, ShoppingCart, AlertTriangle, Clock,
  TrendingUp, TrendingDown, BarChart2
} from "lucide-react";

interface ProfitLoss {
  period: string;
  totalRevenue: number;
  subtotal: number;
  cogs: number;
  totalTax: number;
  grossProfit: number;
  netProfit: number;
  netRevenue: number;
}

interface DashboardSummary {
  totalRevenue: number;
  pendingWorkOrders: number;
  lowStockPartsCount: number;
  availableMotorcycles: number;
  pendingPurchaseOrders: number;
  lowStockParts: { id: number; name: string; quantityOnHand: number; reorderPoint: number }[];
  staleWorkOrders: { id: number; woNumber: string; customerName: string; status: string }[];
  topParts: { partId: number; name: string; totalQty: number }[];
}

interface SalesDataPoint {
  date: string;
  revenue: number;
}

interface InventoryStats {
  motorcycles: { status: string; count: number }[];
}

interface ServiceStats {
  workOrders: { status: string; count: number }[];
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["/analytics/dashboard"],
    queryFn: () => apiFetch<DashboardSummary>("/analytics/dashboard"),
  });

  const { data: salesData, isLoading: isSalesLoading } = useQuery({
    queryKey: ["/analytics/sales"],
    queryFn: () => apiFetch<SalesDataPoint[]>("/analytics/sales?period=30d"),
  });

  const { data: inventoryStats } = useQuery({
    queryKey: ["/analytics/inventory"],
    queryFn: () => apiFetch<InventoryStats>("/analytics/inventory"),
  });

  const { data: serviceStats } = useQuery({
    queryKey: ["/analytics/service"],
    queryFn: () => apiFetch<ServiceStats>("/analytics/service"),
  });

  const { data: pl } = useQuery({
    queryKey: ["/analytics/profit-loss"],
    queryFn: () => apiFetch<ProfitLoss>("/analytics/profit-loss?period=30d"),
  });

  const COLORS = ["#F97316", "#3B82F6", "#10B981", "#6366F1", "#EF4444"];

  if (isSummaryLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  const kpis = [
    { label: t("dashboard.totalRevenue"), value: formatCurrency(summary?.totalRevenue ?? 0), icon: DollarSign, color: "text-green-600" },
    { label: t("dashboard.activeWorkOrders"), value: summary?.pendingWorkOrders ?? 0, icon: Wrench, color: "text-blue-600" },
    { label: t("dashboard.lowStockParts"), value: summary?.lowStockPartsCount ?? 0, icon: Package, color: "text-red-600" },
    { label: t("nav.motorcycles"), value: summary?.availableMotorcycles ?? 0, icon: Bike, color: "text-orange-600" },
    { label: t("dashboard.pendingPos"), value: summary?.pendingPurchaseOrders ?? 0, icon: ShoppingCart, color: "text-purple-600" },
  ];

  const grossMarginPct = pl && pl.subtotal > 0
    ? ((pl.grossProfit / pl.subtotal) * 100).toFixed(1)
    : "0.0";

  const plCards = [
    {
      label: t("dashboard.totalRevenuePnl"),
      value: formatCurrency(pl?.totalRevenue ?? 0),
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: t("dashboard.totalCogs"),
      value: formatCurrency(pl?.cogs ?? 0),
      icon: TrendingDown,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: t("dashboard.grossProfit"),
      value: formatCurrency(pl?.grossProfit ?? 0),
      icon: TrendingUp,
      color: (pl?.grossProfit ?? 0) >= 0 ? "text-green-600" : "text-red-600",
      bg: (pl?.grossProfit ?? 0) >= 0 ? "bg-green-50" : "bg-red-50",
      sub: `${grossMarginPct}% ${t("dashboard.grossMargin")}`,
    },
    {
      label: t("common.total"),
      value: formatCurrency(pl?.netProfit ?? 0),
      icon: BarChart2,
      color: (pl?.netProfit ?? 0) >= 0 ? "text-emerald-600" : "text-red-600",
      bg: (pl?.netProfit ?? 0) >= 0 ? "bg-emerald-50" : "bg-red-50",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.label}</CardTitle>
                <Icon className={`h-4 w-4 ${kpi.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">{t("dashboard.pandlSummary")} — {t("dashboard.last30days")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plCards.map((c, i) => {
            const Icon = c.icon;
            return (
              <Card key={i} className={`border-0 ${c.bg}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                  <Icon className={`h-4 w-4 ${c.color}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                  {c.sub && <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("dashboard.salesOverview")} — {t("dashboard.last30days")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            {isSalesLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value: number) => `RM${value}`} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="#F97316" fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.inventoryStatus")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={inventoryStats?.motorcycles}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="status"
                >
                  {inventoryStats?.motorcycles?.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.workOrderStatus")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceStats?.workOrders}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <CardTitle className="text-base">{t("dashboard.reorderAlerts")}</CardTitle>
          </CardHeader>
          <CardContent>
            {(summary?.lowStockParts?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t("dashboard.noAlerts")}</p>
            ) : (
              <ul className="space-y-2">
                {summary?.lowStockParts?.map(p => (
                  <li key={p.id} className="flex justify-between items-center text-sm">
                    <span className="font-medium truncate max-w-[160px]">{p.name}</span>
                    <Badge variant="destructive">{p.quantityOnHand} / {p.reorderPoint}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            <CardTitle className="text-base">{t("dashboard.staleWorkOrders")}</CardTitle>
          </CardHeader>
          <CardContent>
            {(summary?.staleWorkOrders?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t("dashboard.noStaleWo")}</p>
            ) : (
              <ul className="space-y-2">
                {summary?.staleWorkOrders?.map(wo => (
                  <li key={wo.id} className="flex justify-between items-center text-sm">
                    <span>
                      <span className="font-mono font-medium">{wo.woNumber}</span>
                      <span className="text-muted-foreground ml-1">{wo.customerName}</span>
                    </span>
                    <Badge variant="outline">{wo.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.topParts")}</CardTitle>
          </CardHeader>
          <CardContent>
            {(summary?.topParts?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No sales data yet</p>
            ) : (
              <ul className="space-y-2">
                {summary?.topParts?.map((p, idx) => (
                  <li key={p.partId ?? idx} className="flex justify-between items-center text-sm">
                    <span className="font-medium truncate max-w-[160px]">{p.name ?? "Unknown"}</span>
                    <span className="text-muted-foreground">{p.totalQty} sold</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
