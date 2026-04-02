import { useTranslation } from "react-i18next";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Search, ShoppingCart, Trash2, CreditCard, User, Phone, Plus, Minus,
  Package, Bike, Printer, CheckCircle2, X, Filter,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

/* ─── API types ─────────────────────────────────────────────── */
interface PartProduct {
  id: number; sku: string; name: string; description: string;
  condition: string; subcategoryId: number | null;
  subcategoryName: string | null; categoryName: string | null;
  quantityOnHand: number; sellingPrice: string; modelCompatibility: string | null;
}

interface MotoProduct {
  id: number; make: string; model: string; year: number | null;
  vin: string; color: string | null; engineSize: string | null;
  condition: string; status: string;
  brandId: number | null; brandName: string | null;
  motorcycleCategoryName: string | null;
  sellingPrice: string;
}

interface Category    { id: number; name: string }
interface MotoCategory { id: number; name: string }
interface Brand       { id: number; name: string }
interface Subcategory { id: number; name: string; categoryId: number }

type CartItemType = "part" | "motorcycle";
interface CartItem {
  id: number; name: string; sku?: string; vin?: string;
  sellingPrice: number; quantity: number; type: CartItemType;
  maxQty?: number;
}

interface InvoiceCreated { id: number; invoiceNumber: string }
interface InvoiceLine    { id: number; partName: string | null; description: string; quantity: number; unitPrice: string; totalPrice: string }
interface InvoiceDetail  {
  id: number; invoiceNumber: string; customerName: string;
  customerPhone: string | null; status: string;
  subtotal: string; taxAmount: string; totalAmount: string;
  paymentMethod: string | null; createdAt: string;
  lines: InvoiceLine[];
}

const TAX_RATE = 6;

/* ─── helpers ─────────────────────────────────────────────── */
function conditionBadge(c: string) {
  return c === "new"
    ? <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">New</Badge>
    : <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-[10px]">Used</Badge>;
}

function statusBadge(s: string) {
  const map: Record<string, string> = {
    available: "bg-emerald-100 text-emerald-700",
    sold: "bg-red-100 text-red-600",
    in_service: "bg-blue-100 text-blue-700",
    pre_owned: "bg-orange-100 text-orange-700",
  };
  return <Badge className={`${map[s] ?? "bg-gray-100 text-gray-600"} text-[10px]`}>{s.replace("_", " ")}</Badge>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" });
}

/* ─── Main Component ─────────────────────────────────────── */
export default function POSPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  /* tab */
  const [tab, setTab] = useState<"parts" | "motorcycles">("parts");

  /* filters */
  const [search,             setSearch]             = useState("");
  const [categoryId,         setCategoryId]         = useState<string>("__all__");
  const [subcategoryId,      setSubcategoryId]      = useState<string>("__all__");
  const [brandId,            setBrandId]            = useState<string>("__all__");
  const [motorcycleCatId,    setMotorcycleCatId]    = useState<string>("__all__");
  const [condition,          setCondition]          = useState<string>("__all__");
  const [motoStatus,         setMotoStatus]         = useState<string>("available");

  /* cart */
  const [cart,          setCart]          = useState<CartItem[]>([]);
  const [customerName,  setCustomerName]  = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  /* receipt */
  const [receiptId, setReceiptId] = useState<number | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  /* reset subcategory when category changes */
  useEffect(() => { setSubcategoryId("__all__"); }, [categoryId]);

  /* reset filters when tab changes */
  useEffect(() => {
    setSearch(""); setCategoryId("__all__"); setSubcategoryId("__all__");
    setBrandId("__all__"); setMotorcycleCatId("__all__"); setCondition("__all__");
    if (tab === "motorcycles") setMotoStatus("available");
  }, [tab]);

  /* ── lookup queries ── */
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/categories"],
    queryFn: () => apiFetch("/categories"),
  });

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ["/subcategories"],
    queryFn: () => apiFetch("/subcategories"),
  });

  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ["/motorcycle-brands"],
    queryFn: () => apiFetch("/motorcycle-brands"),
  });

  const { data: motoCategories = [] } = useQuery<MotoCategory[]>({
    queryKey: ["/motorcycle-categories"],
    queryFn: () => apiFetch("/motorcycle-categories"),
  });

  /* ── product queries ── */
  const partsParams = useMemo(() => {
    const p = new URLSearchParams();
    if (search)                      p.set("search", search);
    if (categoryId !== "__all__")    p.set("categoryId", categoryId);
    if (subcategoryId !== "__all__") p.set("subcategoryId", subcategoryId);
    if (condition !== "__all__")     p.set("condition", condition);
    return p.toString();
  }, [search, categoryId, subcategoryId, condition]);

  const { data: parts = [], isLoading: partsLoading } = useQuery<PartProduct[]>({
    queryKey: ["/parts", partsParams],
    queryFn: () => apiFetch(`/parts?${partsParams}`),
    enabled: tab === "parts",
  });

  const motoParams = useMemo(() => {
    const p = new URLSearchParams();
    if (search)                         p.set("search", search);
    if (brandId !== "__all__")          p.set("brandId", brandId);
    if (motorcycleCatId !== "__all__")  p.set("motorcycleCategoryId", motorcycleCatId);
    if (condition !== "__all__")        p.set("condition", condition);
    if (motoStatus !== "__all__")       p.set("status", motoStatus);
    return p.toString();
  }, [search, brandId, motorcycleCatId, condition, motoStatus]);

  const { data: motorcycles = [], isLoading: motosLoading } = useQuery<MotoProduct[]>({
    queryKey: ["/motorcycles", motoParams],
    queryFn: () => apiFetch(`/motorcycles?${motoParams}`),
    enabled: tab === "motorcycles",
  });

  /* ── receipt query ── */
  const { data: receiptDetail } = useQuery<InvoiceDetail>({
    queryKey: ["/invoices", receiptId],
    queryFn: () => apiFetch(`/invoices/${receiptId}`),
    enabled: !!receiptId,
  });

  /* ── filtered subcategories ── */
  const filteredSubs = useMemo(() => {
    if (categoryId === "__all__") return subcategories;
    return subcategories.filter(s => s.categoryId === parseInt(categoryId));
  }, [subcategories, categoryId]);

  /* ── cart helpers ── */
  function addPart(p: PartProduct) {
    if (p.quantityOnHand <= 0) { toast.error("Out of stock"); return; }
    const existing = cart.find(i => i.id === p.id && i.type === "part");
    if (existing) {
      if (existing.quantity >= p.quantityOnHand) { toast.error(`Max stock: ${p.quantityOnHand}`); return; }
      setCart(c => c.map(i => i.id === p.id && i.type === "part" ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart(c => [...c, { id: p.id, name: p.name, sku: p.sku, sellingPrice: parseFloat(p.sellingPrice), quantity: 1, type: "part", maxQty: p.quantityOnHand }]);
    }
    toast.success(`${p.name} added to cart`);
  }

  function addMoto(m: MotoProduct) {
    if (m.status !== "available") { toast.error("Not available"); return; }
    if (cart.find(i => i.id === m.id && i.type === "motorcycle")) { toast.error("Already in cart"); return; }
    setCart(c => [...c, { id: m.id, name: `${m.make} ${m.model} ${m.year ?? ""}`.trim(), vin: m.vin, sellingPrice: parseFloat(m.sellingPrice), quantity: 1, type: "motorcycle" }]);
    toast.success(`${m.make} ${m.model} added to cart`);
  }

  function updateQty(idx: number, delta: number) {
    setCart(c => c.map((item, i) => {
      if (i !== idx) return item;
      const newQty = item.quantity + delta;
      if (newQty < 1) return item;
      if (item.maxQty && newQty > item.maxQty) { toast.error(`Max stock: ${item.maxQty}`); return item; }
      return { ...item, quantity: newQty };
    }));
  }

  function removeFromCart(idx: number) {
    setCart(c => c.filter((_, i) => i !== idx));
  }

  /* ── totals ── */
  const subtotal = cart.reduce((s, i) => s + i.sellingPrice * i.quantity, 0);
  const taxAmount = subtotal * (TAX_RATE / 100);
  const total     = subtotal + taxAmount;

  /* ── checkout ── */
  const checkoutMutation = useMutation<InvoiceCreated, Error, void>({
    mutationFn: () => apiFetch("/invoices", {
      method: "POST",
      body: JSON.stringify({
        customerName,
        customerPhone,
        paymentMethod,
        taxRate: TAX_RATE,
        lines: cart.map(item => ({
          [item.type === "part" ? "partId" : "motorcycleId"]: item.id,
          quantity: item.quantity,
          unitPrice: item.sellingPrice,
          description: item.name,
        })),
      }),
    }),
    onSuccess: (inv) => {
      toast.success(`Invoice ${inv.invoiceNumber} created!`);
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      queryClient.invalidateQueries({ queryKey: ["/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/parts"] });
      queryClient.invalidateQueries({ queryKey: ["/motorcycles"] });
      setReceiptId(inv.id);
      setShowReceipt(true);
    },
    onError: (err) => {
      toast.error(err.message ?? "Checkout failed");
    },
  });

  function handleCheckout() {
    if (!customerName.trim()) { toast.error("Customer name is required"); return; }
    if (cart.length === 0)    { toast.error("Cart is empty"); return; }
    checkoutMutation.mutate();
  }

  /* ── loading state ── */
  const isLoading = tab === "parts" ? partsLoading : motosLoading;

  /* ─────────────────────────────────── render ─────────────── */
  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_370px] gap-4 h-[calc(100vh-7rem)]">

        {/* ══════ LEFT: Product Catalog ══════ */}
        <div className="flex flex-col gap-3 min-h-0">

          {/* Tabs + search */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Tabs value={tab} onValueChange={v => setTab(v as "parts" | "motorcycles")} className="shrink-0">
              <TabsList className="h-9">
                <TabsTrigger value="parts" className="gap-1.5 text-sm">
                  <Package className="h-3.5 w-3.5" /> {t("pos.partsTab")}
                </TabsTrigger>
                <TabsTrigger value="motorcycles" className="gap-1.5 text-sm">
                  <Bike className="h-3.5 w-3.5" /> {t("pos.motorcyclesTab")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={tab === "parts" ? t("pos.searchParts") : t("pos.searchMotorcycles")}
                className="pl-8 h-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

            {tab === "parts" && (
              <>
                {/* Category */}
                <Select value={categoryId} onValueChange={v => setCategoryId(v)}>
                  <SelectTrigger className="h-8 w-40 text-xs">
                    <SelectValue placeholder={t("pos.allCategories")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t("pos.allCategories")}</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Subcategory */}
                <Select value={subcategoryId} onValueChange={v => setSubcategoryId(v)}>
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue placeholder={t("pos.allSubcategories")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t("pos.allSubcategories")}</SelectItem>
                    {filteredSubs.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            {tab === "motorcycles" && (
              <>
                {/* Brand */}
                <Select value={brandId} onValueChange={v => setBrandId(v)}>
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue placeholder={t("pos.allBrands")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t("pos.allBrands")}</SelectItem>
                    {brands.map(b => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Motorcycle Category */}
                <Select value={motorcycleCatId} onValueChange={v => setMotorcycleCatId(v)}>
                  <SelectTrigger className="h-8 w-40 text-xs">
                    <SelectValue placeholder={t("pos.allMotoCategories")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t("pos.allMotoCategories")}</SelectItem>
                    {motoCategories.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status */}
                <Select value={motoStatus} onValueChange={v => setMotoStatus(v)}>
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t("pos.allStatuses")}</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in_service">In Service</SelectItem>
                    <SelectItem value="pre_owned">Pre-owned</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}

            {/* Condition – both tabs */}
            <Select value={condition} onValueChange={v => setCondition(v)}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder={t("pos.allConditions")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("pos.allConditions")}</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="used">Used</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear filters */}
            <Button
              variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
              onClick={() => {
                setSearch(""); setCategoryId("__all__"); setSubcategoryId("__all__");
                setBrandId("__all__"); setMotorcycleCatId("__all__"); setCondition("__all__");
              }}
            >
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          </div>

          {/* Products grid */}
          <div className="flex-1 overflow-y-auto rounded-lg border bg-muted/20 p-3">
            {isLoading ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                {t("common.loading")}
              </div>
            ) : tab === "parts" ? (
              parts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                  <Package className="h-10 w-10 opacity-20" />
                  <span className="text-sm">{t("pos.noProducts")}</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
                  {parts.map(p => (
                    <div
                      key={p.id}
                      className="bg-white rounded-lg border p-3 flex flex-col gap-2 hover:border-orange-300 hover:shadow-sm transition-all"
                    >
                      {p.imageUrl && (
                        <img src={p.imageUrl} alt={p.name} className="w-full h-24 object-cover rounded-md border" />
                      )}
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm leading-tight truncate" title={p.name}>{p.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{p.sku}</div>
                        </div>
                        {conditionBadge(p.condition)}
                      </div>

                      <div className="text-[10px] text-muted-foreground leading-tight">
                        {[p.categoryName, p.subcategoryName].filter(Boolean).join(" › ")}
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-1 border-t">
                        <div>
                          <div className="font-bold text-orange-600 text-sm">{formatCurrency(parseFloat(p.sellingPrice))}</div>
                          <div className={`text-[10px] ${p.quantityOnHand > 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {p.quantityOnHand > 0 ? `${p.quantityOnHand} ${t("pos.inStock")}` : t("pos.outOfStock")}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          disabled={p.quantityOnHand <= 0}
                          className="h-7 w-7 p-0 bg-orange-500 hover:bg-orange-600"
                          onClick={() => addPart(p)}
                          title={t("pos.addToCart")}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              motorcycles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                  <Bike className="h-10 w-10 opacity-20" />
                  <span className="text-sm">{t("pos.noProducts")}</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
                  {motorcycles.map(m => (
                    <div
                      key={m.id}
                      className="bg-white rounded-lg border p-3 flex flex-col gap-2 hover:border-orange-300 hover:shadow-sm transition-all"
                    >
                      {m.imageUrl && (
                        <img src={m.imageUrl} alt={`${m.make} ${m.model}`} className="w-full h-24 object-cover rounded-md border" />
                      )}
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm leading-tight">{m.make} {m.model}</div>
                          <div className="text-[10px] text-muted-foreground">{m.year}{m.color ? ` • ${m.color}` : ""}</div>
                        </div>
                        {conditionBadge(m.condition)}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {statusBadge(m.status)}
                        {m.brandName && (
                          <Badge variant="outline" className="text-[10px]">{m.brandName}</Badge>
                        )}
                        {m.motorcycleCategoryName && (
                          <Badge variant="outline" className="text-[10px]">{m.motorcycleCategoryName}</Badge>
                        )}
                      </div>

                      <div className="text-[10px] text-muted-foreground font-mono">
                        VIN: {m.vin}
                        {m.engineSize ? ` • ${m.engineSize}` : ""}
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-1 border-t">
                        <div className="font-bold text-orange-600 text-sm">{formatCurrency(parseFloat(m.sellingPrice))}</div>
                        <Button
                          size="sm"
                          disabled={m.status !== "available" || !!cart.find(i => i.id === m.id && i.type === "motorcycle")}
                          className="h-7 w-7 p-0 bg-orange-500 hover:bg-orange-600 disabled:opacity-40"
                          onClick={() => addMoto(m)}
                          title={t("pos.addToCart")}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* ══════ RIGHT: Cart & Checkout ══════ */}
        <div className="flex flex-col gap-3 min-h-0">

          {/* Customer info */}
          <Card className="shrink-0">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <User className="h-4 w-4 text-orange-500" />
                {t("pos.customerInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder={t("pos.walkInCustomer")}
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder="012-3456789"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                />
              </div>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-8 text-sm">
                  <CreditCard className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t("pos.paymentCash")}</SelectItem>
                  <SelectItem value="card">{t("pos.paymentCard")}</SelectItem>
                  <SelectItem value="transfer">{t("pos.paymentTransfer")}</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Cart items */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-1 pt-3 px-4 shrink-0">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <ShoppingCart className="h-4 w-4 text-orange-500" />
                {t("pos.cart")}
                {cart.length > 0 && (
                  <Badge className="ml-auto bg-orange-500 text-white h-5 px-1.5 text-[10px]">{cart.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                  <ShoppingCart className="h-8 w-8 opacity-20" />
                  <span className="text-xs">{t("pos.emptyCart")}</span>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-muted/40 rounded-md p-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{item.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {item.type === "part" ? item.sku : item.vin}
                        {" · "}{formatCurrency(item.sellingPrice)}
                      </div>
                    </div>

                    {item.type === "part" ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="outline" size="icon" className="h-5 w-5" onClick={() => updateQty(idx, -1)}>
                          <Minus className="h-2.5 w-2.5" />
                        </Button>
                        <span className="text-xs w-5 text-center font-medium">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-5 w-5" onClick={() => updateQty(idx, 1)}>
                          <Plus className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground shrink-0">×1</span>
                    )}

                    <div className="text-xs font-bold text-orange-600 w-16 text-right shrink-0">
                      {formatCurrency(item.sellingPrice * item.quantity)}
                    </div>

                    <Button
                      variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                      onClick={() => removeFromCart(idx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Summary & checkout */}
          <Card className="shrink-0 border-2 border-orange-100">
            <CardContent className="px-4 pt-3 pb-4 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("pos.subtotal")}</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("pos.tax")}</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm">Total</span>
                <span className="text-xl font-black text-orange-600">{formatCurrency(total)}</span>
              </div>
              <Button
                className="w-full h-10 bg-orange-500 hover:bg-orange-600 text-sm font-bold mt-1"
                disabled={cart.length === 0 || checkoutMutation.isPending}
                onClick={handleCheckout}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {checkoutMutation.isPending ? "Processing..." : t("pos.checkout")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ══════ Invoice Receipt Dialog ══════ */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto print:shadow-none" id="pos-receipt">
          <DialogHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              <DialogTitle>{t("pos.saleComplete")}</DialogTitle>
            </div>
          </DialogHeader>

          {receiptDetail ? (
            <div className="space-y-4">
              {/* Invoice header */}
              <div className="text-center border rounded-lg p-4 bg-orange-50">
                <div className="text-2xl font-black text-orange-600">{receiptDetail.invoiceNumber}</div>
                <div className="text-xs text-muted-foreground mt-1">{formatDate(receiptDetail.createdAt)}</div>
              </div>

              {/* Customer */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">{t("pos.customerName")}</div>
                  <div className="font-medium">{receiptDetail.customerName}</div>
                </div>
                {receiptDetail.customerPhone && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">{t("pos.customerPhone")}</div>
                    <div className="font-medium">{receiptDetail.customerPhone}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">{t("pos.paymentMethod")}</div>
                  <div className="font-medium capitalize">{receiptDetail.paymentMethod ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">Status</div>
                  <Badge className="bg-green-100 text-green-700 capitalize">{receiptDetail.status}</Badge>
                </div>
              </div>

              <Separator />

              {/* Lines */}
              <div className="space-y-1">
                <div className="grid grid-cols-[1fr_auto_auto_auto] text-[10px] text-muted-foreground font-medium pb-1 border-b gap-2">
                  <span>Item</span>
                  <span className="text-center">Qty</span>
                  <span className="text-right">Unit</span>
                  <span className="text-right">Total</span>
                </div>
                {receiptDetail.lines.map(line => (
                  <div key={line.id} className="grid grid-cols-[1fr_auto_auto_auto] text-xs py-1 gap-2 border-b border-dashed last:border-0">
                    <span className="font-medium leading-tight">{line.partName ?? line.description}</span>
                    <span className="text-center text-muted-foreground">{line.quantity}</span>
                    <span className="text-right">{formatCurrency(parseFloat(line.unitPrice))}</span>
                    <span className="text-right font-bold">{formatCurrency(parseFloat(line.totalPrice))}</span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("pos.subtotal")}</span>
                  <span>{formatCurrency(parseFloat(receiptDetail.subtotal))}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("pos.tax")}</span>
                  <span>{formatCurrency(parseFloat(receiptDetail.taxAmount))}</span>
                </div>
                <div className="flex justify-between font-black text-lg border-t pt-2 mt-2">
                  <span>Total</span>
                  <span className="text-orange-600">{formatCurrency(parseFloat(receiptDetail.totalAmount))}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline" className="flex-1 gap-2"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4" /> {t("pos.printReceipt")}
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 gap-2"
                  onClick={() => { setShowReceipt(false); setReceiptId(null); }}
                >
                  <CheckCircle2 className="h-4 w-4" /> {t("pos.done")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-muted-foreground text-sm">{t("common.loading")}</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
