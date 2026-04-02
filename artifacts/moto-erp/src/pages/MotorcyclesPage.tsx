import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Edit, Trash2, Settings2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { ImageUpload } from "@/components/ImageUpload";

const motorcycleSchema = z.object({
  brandId: z.string().optional(),
  make: z.string().optional(),
  model: z.string().min(1, "Model is required"),
  year: z.number().min(1900),
  vin: z.string().optional(),
  color: z.string().optional(),
  engineSize: z.string().optional(),
  mileage: z.number().optional(),
  condition: z.enum(["new", "used"]),
  status: z.enum(["available", "sold", "in_service", "pre_owned"]),
  motorcycleSubcategoryId: z.string().optional(),
  costPrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  warehouseId: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
  engineCc: z.number().int().optional().nullable(),
  topSpeed: z.number().int().optional().nullable(),
  fuelCapacity: z.number().optional().nullable(),
  weight: z.number().int().optional().nullable(),
  seatHeight: z.number().int().optional().nullable(),
  transmission: z.string().optional().nullable(),
  fuelType: z.string().optional().nullable(),
  features: z.string().optional().nullable(),
});

type MotorcycleFormValues = z.infer<typeof motorcycleSchema>;

export default function MotorcyclesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCondition, setFilterCondition] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMotorcycle, setEditingMotorcycle] = useState<any>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("__none__");

  const { data: motorcycles, isLoading } = useQuery({
    queryKey: ["/motorcycles", search, filterCondition],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterCondition !== "all") params.set("condition", filterCondition);
      return apiFetch<any[]>(`/motorcycles?${params.toString()}`);
    },
  });

  const { data: motorcycleCategories } = useQuery({
    queryKey: ["/motorcycle-categories"],
    queryFn: () => apiFetch<any[]>("/motorcycle-categories"),
  });

  const { data: motorcycleSubcategories } = useQuery({
    queryKey: ["/motorcycle-subcategories"],
    queryFn: () => apiFetch<any[]>("/motorcycle-subcategories"),
  });

  const { data: motorcycleBrands } = useQuery({
    queryKey: ["/motorcycle-brands"],
    queryFn: () => apiFetch<any[]>("/motorcycle-brands"),
  });

  const { data: warehouses } = useQuery({
    queryKey: ["/warehouses"],
    queryFn: () => apiFetch<any[]>("/warehouses"),
  });

  const [selectedBrandCategoryId, setSelectedBrandCategoryId] = useState<string>("__all__");

  const filteredBrands = motorcycleBrands?.filter(
    (b: any) => selectedBrandCategoryId === "__all__" || String(b.motorcycleCategoryId) === selectedBrandCategoryId
  ) ?? [];

  const filteredSubcategories = motorcycleSubcategories?.filter(
    (s: any) => selectedCategoryId === "__none__" || String(s.motorcycleCategoryId) === selectedCategoryId
  ) ?? [];

  const form = useForm<MotorcycleFormValues>({
    resolver: zodResolver(motorcycleSchema),
    defaultValues: {
      brandId: undefined,
      make: "",
      model: "",
      year: new Date().getFullYear(),
      vin: "",
      color: "",
      engineSize: "",
      condition: "new",
      status: "available",
      motorcycleSubcategoryId: undefined,
      costPrice: 0,
      sellingPrice: 0,
      engineCc: null,
      topSpeed: null,
      fuelCapacity: null,
      weight: null,
      seatHeight: null,
      transmission: null,
      fuelType: null,
      features: null,
    },
  });

  const closeDialog = () => {
    setIsAddOpen(false);
    setEditingMotorcycle(null);
    setSelectedCategoryId("__none__");
    setSelectedBrandCategoryId("__all__");
    form.reset();
  };

  const buildPayload = (values: MotorcycleFormValues) => {
    const brand = motorcycleBrands?.find((b: any) => String(b.id) === values.brandId);
    return {
      ...values,
      make: brand?.name ?? values.make ?? "",
      brandId: values.brandId ? parseInt(values.brandId) : null,
      motorcycleSubcategoryId: values.motorcycleSubcategoryId ? parseInt(values.motorcycleSubcategoryId) : null,
      warehouseId: values.warehouseId ? parseInt(values.warehouseId) : null,
    };
  };

  const createMutation = useMutation({
    mutationFn: (values: MotorcycleFormValues) => apiFetch("/motorcycles", {
      method: "POST",
      body: JSON.stringify(buildPayload(values)),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/motorcycles"] });
      toast.success(t("motorcycles.createMotorcycle"));
      closeDialog();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: (values: MotorcycleFormValues) => apiFetch(`/motorcycles/${editingMotorcycle.id}`, {
      method: "PUT",
      body: JSON.stringify(buildPayload(values)),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/motorcycles"] });
      toast.success(t("motorcycles.updateMotorcycle"));
      closeDialog();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/motorcycles/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/motorcycles"] });
      toast.success("Motorcycle deleted");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const onSubmit = (values: MotorcycleFormValues) => {
    if (editingMotorcycle) updateMutation.mutate(values);
    else createMutation.mutate(values);
  };

  const startEdit = (moto: any) => {
    setEditingMotorcycle(moto);
    const brand = motorcycleBrands?.find((b: any) => b.id === moto.brandId);
    const brandCatId = brand?.motorcycleCategoryId ? String(brand.motorcycleCategoryId) : "__all__";
    setSelectedBrandCategoryId(brandCatId);
    const moSub = motorcycleSubcategories?.find((s: any) => s.id === moto.motorcycleSubcategoryId);
    const moSubCatId = moSub?.motorcycleCategoryId ? String(moSub.motorcycleCategoryId) : "__none__";
    setSelectedCategoryId(moSubCatId);
    form.reset({
      brandId: moto.brandId ? String(moto.brandId) : undefined,
      make: moto.make ?? "",
      model: moto.model ?? "",
      year: moto.year,
      vin: moto.vin ?? "",
      color: moto.color ?? "",
      engineSize: moto.engineSize ?? "",
      mileage: moto.mileage ?? undefined,
      condition: moto.condition ?? "new",
      status: moto.status ?? "available",
      motorcycleSubcategoryId: moto.motorcycleSubcategoryId ? String(moto.motorcycleSubcategoryId) : undefined,
      costPrice: parseFloat(moto.costPrice ?? "0"),
      sellingPrice: parseFloat(moto.sellingPrice ?? "0"),
      warehouseId: moto.warehouseId ? String(moto.warehouseId) : undefined,
      imageUrl: moto.imageUrl ?? null,
      engineCc: moto.engineCc ?? null,
      topSpeed: moto.topSpeed ?? null,
      fuelCapacity: moto.fuelCapacity ? parseFloat(moto.fuelCapacity) : null,
      weight: moto.weight ?? null,
      seatHeight: moto.seatHeight ?? null,
      transmission: moto.transmission ?? null,
      fuelType: moto.fuelType ?? null,
      features: moto.features ?? null,
    });
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      available: "bg-green-500",
      sold: "bg-gray-500",
      in_service: "bg-yellow-500",
      pre_owned: "bg-blue-500",
    };
    const labelMap: Record<string, string> = {
      available: t("motorcycles.statusAvailable"),
      sold: t("motorcycles.statusSold"),
      in_service: t("motorcycles.statusInService"),
      pre_owned: t("motorcycles.statusPreOwned"),
    };
    return <Badge className={map[status] ?? ""}>{labelMap[status] ?? status}</Badge>;
  };

  const getConditionBadge = (condition: string) => {
    if (condition === "new") return <Badge className="bg-emerald-500 text-white">{t("motorcycles.conditionNew")}</Badge>;
    return <Badge className="bg-amber-500 text-white">{t("motorcycles.conditionUsed")}</Badge>;
  };

  const isDialogOpen = isAddOpen || !!editingMotorcycle;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("motorcycles.title")}</h1>
          <p className="text-muted-foreground">{t("motorcycles.subtitle")}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddOpen(true)} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" />
              {t("motorcycles.addMotorcycle")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMotorcycle ? t("motorcycles.editMotorcycle") : t("motorcycles.addMotorcycle")}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                {/* Brand filter category + Brand */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("motorcycleCategories.title")}</label>
                    <Select
                      value={selectedBrandCategoryId}
                      onValueChange={(val) => {
                        setSelectedBrandCategoryId(val);
                        form.setValue("brandId", undefined);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`— ${t("motorcycleCategories.title")} —`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">{t("common.all")}</SelectItem>
                        {motorcycleCategories?.map((c: any) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormField control={form.control} name="brandId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("motorcycles.brand")}</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)} value={field.value ?? "__none__"}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder={`— ${t("motorcycles.selectBrand")} —`} /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">{t("common.none")}</SelectItem>
                          {filteredBrands.map((b: any) => (
                            <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Model */}
                <FormField control={form.control} name="model" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("motorcycles.model")}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Year / Color / Engine */}
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="year" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("motorcycles.year")}</FormLabel>
                      <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="color" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("motorcycles.color")}</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="engineSize" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("motorcycles.engineCC")}</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* VIN / Mileage */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="vin" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("motorcycles.vin")}</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="mileage" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("motorcycles.mileage")}</FormLabel>
                      <FormControl>
                        <Input type="number" value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Condition / Status */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="condition" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("motorcycles.condition")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="new">{t("motorcycles.conditionNew")}</SelectItem>
                          <SelectItem value="used">{t("motorcycles.conditionUsed")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.status")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="available">{t("motorcycles.statusAvailable")}</SelectItem>
                          <SelectItem value="sold">{t("motorcycles.statusSold")}</SelectItem>
                          <SelectItem value="in_service">{t("motorcycles.statusInService")}</SelectItem>
                          <SelectItem value="pre_owned">{t("motorcycles.statusPreOwned")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Motorcycle Category / Motorcycle Subcategory */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("motorcycleCategories.title")}</label>
                    <Select
                      value={selectedCategoryId}
                      onValueChange={(val) => {
                        setSelectedCategoryId(val);
                        form.setValue("motorcycleSubcategoryId", undefined);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`— ${t("motorcycleCategories.title")} —`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("common.none")}</SelectItem>
                        {motorcycleCategories?.map((c: any) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <FormField control={form.control} name="motorcycleSubcategoryId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("motorcycleSubcategories.title")}</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)}
                        value={field.value ?? "__none__"}
                        disabled={selectedCategoryId === "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={`— ${t("motorcycleSubcategories.title")} —`} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">{t("common.none")}</SelectItem>
                          {filteredSubcategories.map((s: any) => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Prices */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="costPrice" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("motorcycles.costPrice")}</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="sellingPrice" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("motorcycles.sellingPrice")}</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Warehouse */}
                <FormField control={form.control} name="warehouseId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("motorcycles.warehouseCol")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="— Select warehouse —" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {warehouses?.map((w: any) => (
                          <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="imageUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.image")} ({t("common.optional")})</FormLabel>
                    <FormControl>
                      <ImageUpload value={field.value} onChange={field.onChange} disabled={createMutation.isPending || updateMutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <Separator />
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Settings2 className="h-4 w-4" />
                  {t("motorcycles.specifications")}
                </div>

                {/* Engine CC / Top Speed / Fuel Capacity */}
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="engineCc" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("motorcycles.engineCc")}</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 600" value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="topSpeed" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("motorcycles.topSpeed")}</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="km/h" value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="fuelCapacity" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("motorcycles.fuelCapacity")}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="L" value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Weight / Seat Height / Fuel Type */}
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="weight" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("motorcycles.weight")}</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="kg" value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="seatHeight" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("motorcycles.seatHeight")}</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="mm" value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="fuelType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("motorcycles.fuelType")}</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Petrol" value={field.value ?? ""} onChange={e => field.onChange(e.target.value || null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Transmission */}
                <FormField control={form.control} name="transmission" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("motorcycles.transmission")}</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 6-speed manual" value={field.value ?? ""} onChange={e => field.onChange(e.target.value || null)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Features */}
                <FormField control={form.control} name="features" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("motorcycles.features")}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t("motorcycles.featuresPlaceholder")} rows={3} value={field.value ?? ""} onChange={e => field.onChange(e.target.value || null)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeDialog}>{t("common.cancel")}</Button>
                  <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingMotorcycle ? t("motorcycles.updateMotorcycle") : t("motorcycles.createMotorcycle")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("motorcycles.searchMotorcycles")}
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterCondition} onValueChange={setFilterCondition}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="new">{t("motorcycles.conditionNew")}</SelectItem>
            <SelectItem value="used">{t("motorcycles.conditionUsed")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">{t("common.image")}</TableHead>
              <TableHead>{t("motorcycles.makeAndModel")}</TableHead>
              <TableHead>{t("motorcycles.year")}</TableHead>
              <TableHead>{t("motorcycles.conditionCol")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("motorcycles.subcategory")}</TableHead>
              <TableHead className="text-right">{t("motorcycles.sellingPriceCol")}</TableHead>
              <TableHead>{t("motorcycles.warehouseCol")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(8)].map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-6 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : motorcycles?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {t("motorcycles.noMotorcycles")}
                </TableCell>
              </TableRow>
            ) : (
              motorcycles?.map((moto) => (
                <TableRow key={moto.id}>
                  <TableCell>
                    {moto.imageUrl
                      ? <img src={moto.imageUrl} alt={moto.model} className="h-9 w-9 rounded object-cover border" />
                      : <div className="h-9 w-9 rounded bg-muted" />
                    }
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {moto.brandName && <span className="text-orange-600 font-semibold">{moto.brandName} </span>}
                      {moto.model}
                    </div>
                    <div className="text-xs text-muted-foreground">{moto.vin || moto.color}</div>
                  </TableCell>
                  <TableCell>{moto.year}</TableCell>
                  <TableCell>{getConditionBadge(moto.condition)}</TableCell>
                  <TableCell>{getStatusBadge(moto.status)}</TableCell>
                  <TableCell>
                    {moto.motorcycleSubcategoryName ? (
                      <div className="text-sm">
                        <span className="text-muted-foreground">{moto.motorcycleCategoryName} › </span>
                        {moto.motorcycleSubcategoryName}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(moto.sellingPrice)}</TableCell>
                  <TableCell>{moto.warehouseName || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(moto)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => { if (confirm("Delete this motorcycle?")) deleteMutation.mutate(moto.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
