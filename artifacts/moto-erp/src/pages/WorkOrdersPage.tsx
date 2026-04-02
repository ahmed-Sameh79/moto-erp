import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Form, FormControl, FormField, FormItem, FormLabel 
} from "@/components/ui/form";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Wrench, Eye, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";

interface WorkOrderSummary {
  id: number;
  woNumber: string;
  customerName: string;
  customerPhone: string;
  motorcycleId: number | null;
  motorcycleName: string | null;
  description: string;
  status: string;
  assignedTo: number | null;
  assignedToName: string | null;
  laborCost: string;
  totalPartsCost: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

interface WorkOrderLine {
  id: number;
  workOrderId: number;
  partId: number;
  partName: string | null;
  partSku: string | null;
  binId: number | null;
  binLabel: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

interface WorkOrderDetail extends WorkOrderSummary {
  lines: WorkOrderLine[];
}

interface Technician {
  id: number;
  fullName: string;
}

interface MotorcycleItem {
  id: number;
  make: string;
  model: string;
  vin: string;
}

interface PartItem {
  id: number;
  name: string;
  quantityOnHand: number;
}

interface BinItem {
  id: number;
  label: string;
}

const woSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().min(1, "Customer phone is required"),
  motorcycleId: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  assignedTo: z.string().min(1, "Technician is required"),
  laborCost: z.number().min(0),
  lines: z.array(z.object({
    partId: z.string().min(1),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    binId: z.string().optional(),
  })).optional(),
});

type WOFormValues = z.infer<typeof woSchema>;

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["parts_reserved", "cancelled"],
  parts_reserved: ["ready_for_invoice", "draft", "cancelled"],
  ready_for_invoice: ["invoiced", "parts_reserved", "cancelled"],
  invoiced: [],
  cancelled: [],
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  parts_reserved: "Parts Reserved",
  ready_for_invoice: "Ready to Invoice",
  invoiced: "Invoiced",
  cancelled: "Cancelled",
};

export default function WorkOrdersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedWOId, setSelectedWOId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: wos } = useQuery({
    queryKey: ["/work-orders"],
    queryFn: () => apiFetch<WorkOrderSummary[]>("/work-orders"),
  });
  const { data: selectedWO } = useQuery({
    queryKey: ["/work-orders", selectedWOId],
    queryFn: () => apiFetch<WorkOrderDetail>(`/work-orders/${selectedWOId!}`),
    enabled: !!selectedWOId,
  });
  const { data: technicians } = useQuery({
    queryKey: ["/users", "technician"],
    queryFn: () => apiFetch<Technician[]>("/users?role=technician"),
  });
  const { data: motorcycles } = useQuery({
    queryKey: ["/motorcycles"],
    queryFn: () => apiFetch<MotorcycleItem[]>("/motorcycles"),
  });
  const { data: parts } = useQuery({
    queryKey: ["/parts"],
    queryFn: () => apiFetch<PartItem[]>("/parts"),
  });
  const { data: bins } = useQuery({
    queryKey: ["/bins"],
    queryFn: () => apiFetch<BinItem[]>("/bins"),
  });

  const form = useForm<WOFormValues>({
    resolver: zodResolver(woSchema),
    defaultValues: { customerName: "", customerPhone: "", description: "", assignedTo: "", laborCost: 0, lines: [] },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });

  const buildPayload = (values: WOFormValues) => ({
    ...values,
    motorcycleId: values.motorcycleId && values.motorcycleId !== "none" ? parseInt(values.motorcycleId) : null,
    assignedTo: values.assignedTo && values.assignedTo !== "none" ? parseInt(values.assignedTo) : null,
    lines: values.lines?.map(l => ({
      partId: parseInt(l.partId),
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      binId: l.binId && l.binId !== "none" ? parseInt(l.binId) : null,
    })) ?? [],
  });

  const createMutation = useMutation<WorkOrderSummary, Error, WOFormValues>({
    mutationFn: (values) => apiFetch<WorkOrderSummary>("/work-orders", { method: "POST", body: JSON.stringify(buildPayload(values)) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/work-orders"] });
      toast.success("Work Order created");
      setIsAddOpen(false);
      form.reset();
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to create work order");
    },
  });

  const updateStatusMutation = useMutation<WorkOrderSummary, Error, { id: string; status: string }>({
    mutationFn: ({ id, status }) => apiFetch<WorkOrderSummary>(`/work-orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/work-orders"] });
      if (selectedWOId) queryClient.invalidateQueries({ queryKey: ["/work-orders", selectedWOId] });
      toast.success("Status updated");
    },
    onError: (err) => {
      toast.error(err.message ?? "Invalid status transition");
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700 border",
      parts_reserved: "bg-blue-500 text-white",
      ready_for_invoice: "bg-green-500 text-white",
      invoiced: "bg-slate-500 text-white",
      cancelled: "bg-red-500 text-white",
    };
    return <Badge className={variants[status] ?? ""}>{STATUS_LABELS[status] ?? status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("workOrders.title")}</h1>
          <p className="text-muted-foreground">{t("workOrders.subtitle")}</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600"><Plus className="h-4 w-4 mr-2" /> {t("workOrders.createWO")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
            <DialogHeader><DialogTitle>{t("workOrders.createWorkOrder")}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(v => createMutation.mutate(v))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="customerName" render={({ field }) => (
                    <FormItem><FormLabel>{t("workOrders.customerName")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="customerPhone" render={({ field }) => (
                    <FormItem><FormLabel>{t("workOrders.customerPhone")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="motorcycleId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("workOrders.motorcycleLabel")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("workOrders.motorcycle")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {motorcycles?.map(m => (
                          <SelectItem key={m.id} value={String(m.id)}>{m.make} {m.model} ({m.vin})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>{t("workOrders.issueDescription")}</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="assignedTo" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("workOrders.assignTechnician")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("workOrders.technician")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {technicians?.map(t => (
                            <SelectItem key={t.id} value={String(t.id)}>{t.fullName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="laborCost" render={({ field }) => (
                    <FormItem><FormLabel>{t("workOrders.laborCost")}</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem>
                  )} />
                </div>
                <div className="space-y-2">
                  <FormLabel>{t("workOrders.requiredParts")}</FormLabel>
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-end border p-2 rounded">
                      <div className="col-span-5">
                        <FormField control={form.control} name={`lines.${index}.partId`} render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Part" /></SelectTrigger></FormControl>
                              <SelectContent>
                                {parts?.map(p => (
                                  <SelectItem key={p.id} value={String(p.id)}>{p.name} (Qty: {p.quantityOnHand})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                      </div>
                      <div className="col-span-2">
                        <FormField control={form.control} name={`lines.${index}.quantity`} render={({ field }) => (
                          <FormItem><FormControl><Input type="number" placeholder={t("invoices.qty")} {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl></FormItem>
                        )} />
                      </div>
                      <div className="col-span-2">
                        <FormField control={form.control} name={`lines.${index}.unitPrice`} render={({ field }) => (
                          <FormItem><FormControl><Input type="number" step="0.01" placeholder={t("common.price")} {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem>
                        )} />
                      </div>
                      <div className="col-span-2">
                        <FormField control={form.control} name={`lines.${index}.binId`} render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder={t("parts.bin")} /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="none">{t("workOrders.noBin")}</SelectItem>
                                {bins?.map(b => (
                                  <SelectItem key={b.id} value={String(b.id)}>{b.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                      </div>
                      <div className="col-span-1">
                        <Button variant="ghost" size="icon" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ partId: "", quantity: 1, unitPrice: 0, binId: "" })}
                  >
                    Add Part
                  </Button>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? t("workOrders.creating") : t("workOrders.createWorkOrder")}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("workOrders.woNumber")}</TableHead>
              <TableHead>{t("workOrders.customer")}</TableHead>
              <TableHead>{t("workOrders.motorcycle")}</TableHead>
              <TableHead>{t("workOrders.technician")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-right">{t("workOrders.laborCost")}</TableHead>
              <TableHead>{t("workOrders.dateCol")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {wos?.map(wo => {
              const isStale = wo.status !== "invoiced" && wo.status !== "cancelled" && differenceInDays(new Date(), new Date(wo.updatedAt)) >= 7;
              const nextStatuses = VALID_TRANSITIONS[wo.status] ?? [];
              return (
                <TableRow key={wo.id}>
                  <TableCell className="font-mono font-medium">
                    {wo.woNumber}
                    {isStale && <Badge variant="destructive" className="ml-2 text-[10px]">STALE</Badge>}
                  </TableCell>
                  <TableCell>
                    <div>{wo.customerName}</div>
                    <div className="text-xs text-muted-foreground">{wo.customerPhone}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{wo.motorcycleName ?? "—"}</TableCell>
                  <TableCell>{wo.assignedToName}</TableCell>
                  <TableCell>{getStatusBadge(wo.status)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(wo.laborCost)}</TableCell>
                  <TableCell>{formatDate(wo.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {nextStatuses.length > 0 && (
                        <Select onValueChange={(status) => updateStatusMutation.mutate({ id: String(wo.id), status })}>
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue placeholder={t("workOrders.changeStatus")} />
                          </SelectTrigger>
                          <SelectContent>
                            {nextStatuses.map(s => (
                              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setSelectedWOId(String(wo.id))}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {!wos?.length && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">{t("workOrders.noWorkOrders")}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedWOId && (
        <Dialog open={!!selectedWOId} onOpenChange={() => setSelectedWOId(null)}>
          <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                {t("workOrders.woTitle")}: {selectedWO?.woNumber ?? t("common.loading")}
              </DialogTitle>
            </DialogHeader>
            {!selectedWO ? (
              <div className="py-8 text-center text-muted-foreground">{t("workOrders.loadingDetails")}</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div><span className="text-muted-foreground">Status:</span> {getStatusBadge(selectedWO.status)}</div>
                  <div><span className="text-muted-foreground">Technician:</span> {selectedWO.assignedToName ?? t("workOrders.unassigned")}</div>
                  <div><span className="text-muted-foreground">Customer:</span> {selectedWO.customerName}</div>
                  <div><span className="text-muted-foreground">Phone:</span> {selectedWO.customerPhone}</div>
                  {selectedWO.motorcycleName && (
                    <div className="col-span-2"><span className="text-muted-foreground">Motorcycle:</span> {selectedWO.motorcycleName}</div>
                  )}
                  <div className="col-span-2"><span className="text-muted-foreground">Description:</span> {selectedWO.description}</div>
                  <div><span className="text-muted-foreground">Labor Cost:</span> {formatCurrency(selectedWO.laborCost)}</div>
                  <div><span className="text-muted-foreground">Parts Cost:</span> {formatCurrency(selectedWO.totalPartsCost)}</div>
                  <div><span className="text-muted-foreground">Created:</span> {formatDate(selectedWO.createdAt)}</div>
                  <div><span className="text-muted-foreground">Last Updated:</span> {formatDate(selectedWO.updatedAt)}</div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">{t("workOrders.reservedParts")}</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("workOrders.partName")}</TableHead>
                        <TableHead>{t("workOrders.skuCol")}</TableHead>
                        <TableHead>{t("workOrders.binLocation")}</TableHead>
                        <TableHead className="text-right">{t("invoices.qty")}</TableHead>
                        <TableHead className="text-right">{t("invoices.unitPrice")}</TableHead>
                        <TableHead className="text-right">{t("common.total")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedWO.lines?.length ? selectedWO.lines.map(line => (
                        <TableRow key={line.id}>
                          <TableCell>{line.partName}</TableCell>
                          <TableCell className="font-mono text-xs">{line.partSku}</TableCell>
                          <TableCell>
                            {line.binLabel ? (
                              <Badge variant="outline" className="text-xs">{line.binLabel}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{line.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(line.unitPrice)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(line.totalPrice)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">{t("workOrders.noPartsReserved")}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <div className="text-sm font-semibold">
                    {t("common.total")}: {formatCurrency(parseFloat(selectedWO.laborCost) + parseFloat(selectedWO.totalPartsCost))}
                  </div>
                  <div className="flex gap-2">
                    {(VALID_TRANSITIONS[selectedWO.status] ?? []).map(nextStatus => (
                      <Button
                        key={nextStatus}
                        variant={nextStatus === "cancelled" ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: String(selectedWO.id), status: nextStatus })}
                        disabled={updateStatusMutation.isPending}
                      >
                        → {STATUS_LABELS[nextStatus]}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
