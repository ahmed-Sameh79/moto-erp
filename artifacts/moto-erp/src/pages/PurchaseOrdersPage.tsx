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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, ShoppingCart, Eye, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

const poSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  lines: z.array(z.object({
    partId: z.string().min(1, "Part is required"),
    quantity: z.number().min(1),
    unitCost: z.number().min(0),
  })).min(1, "At least one item is required"),
});

export default function PurchaseOrdersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: pos, isLoading } = useQuery({
    queryKey: ["/purchase-orders"],
    queryFn: () => apiFetch<any[]>("/purchase-orders"),
  });

  const { data: selectedPO } = useQuery({
    queryKey: ["/purchase-orders", selectedPOId],
    queryFn: () => apiFetch<any>(`/purchase-orders/${selectedPOId}`),
    enabled: !!selectedPOId,
  });

  const { data: vendors } = useQuery({ queryKey: ["/vendors"], queryFn: () => apiFetch<any[]>("/vendors") });
  const { data: parts } = useQuery({ queryKey: ["/parts"], queryFn: () => apiFetch<any[]>("/parts") });

  const form = useForm<z.infer<typeof poSchema>>({
    resolver: zodResolver(poSchema),
    defaultValues: { vendorId: "", lines: [{ partId: "", quantity: 1, unitCost: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });

  const createMutation = useMutation({
    mutationFn: (values: any) => apiFetch("/purchase-orders", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/purchase-orders"] });
      toast.success("Purchase Order created");
      setIsAddOpen(false);
      form.reset();
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/purchase-orders/${id}/confirm`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/purchase-orders"] });
      toast.success("Order confirmed");
      setSelectedPOId(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("purchaseOrders.title")}</h1>
          <p className="text-muted-foreground">{t("purchaseOrders.subtitle")}</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600"><Plus className="h-4 w-4 mr-2" /> {t("purchaseOrders.addPO")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
            <DialogHeader><DialogTitle>{t("purchaseOrders.createPO")}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(v => createMutation.mutate(v))} className="space-y-4">
                <FormField control={form.control} name="vendorId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("purchaseOrders.vendor")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("purchaseOrders.selectVendor")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {vendors?.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <div className="space-y-2">
                  <FormLabel>{t("purchaseOrders.items")}</FormLabel>
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-end border p-2 rounded">
                      <div className="col-span-6">
                        <FormField control={form.control} name={`lines.${index}.partId`} render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder={t("purchaseOrders.selectPart")} /></SelectTrigger></FormControl>
                              <SelectContent>
                                {parts?.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                      </div>
                      <div className="col-span-2">
                        <FormField control={form.control} name={`lines.${index}.quantity`} render={({ field }) => (
                          <FormItem><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl></FormItem>
                        )} />
                      </div>
                      <div className="col-span-3">
                        <FormField control={form.control} name={`lines.${index}.unitCost`} render={({ field }) => (
                          <FormItem><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem>
                        )} />
                      </div>
                      <div className="col-span-1">
                        <Button variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ partId: "", quantity: 1, unitCost: 0 })}>{t("purchaseOrders.addLine")}</Button>
                </div>
                <Button type="submit" className="w-full">{t("purchaseOrders.createPO")}</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("purchaseOrders.poNumber")}</TableHead>
              <TableHead>{t("purchaseOrders.vendor")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-right">{t("purchaseOrders.totalAmount")}</TableHead>
              <TableHead>{t("purchaseOrders.createdAt")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pos?.map(po => (
              <TableRow key={po.id}>
                <TableCell className="font-mono font-medium">{po.poNumber}</TableCell>
                <TableCell>{po.vendorName}</TableCell>
                <TableCell>
                  <Badge variant={po.status === 'confirmed' ? 'default' : po.status === 'received' ? 'secondary' : 'outline'}>
                    {po.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(po.totalAmount)}</TableCell>
                <TableCell>{formatDate(po.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedPOId(po.id)}><Eye className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedPOId && (
        <Dialog open={!!selectedPOId} onOpenChange={() => setSelectedPOId(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{t("purchaseOrders.poDetails")}: {selectedPO?.poNumber ?? t("common.loading")}</DialogTitle></DialogHeader>
            {!selectedPO ? (
              <div className="py-8 text-center text-muted-foreground">{t("common.loading")}</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Vendor:</span> {selectedPO.vendorName}</div>
                  <div><span className="text-muted-foreground">Date:</span> {formatDate(selectedPO.createdAt)}</div>
                  <div><span className="text-muted-foreground">Status:</span> {selectedPO.status}</div>
                  <div className="font-bold text-orange-600"><span className="text-muted-foreground">Total:</span> {formatCurrency(selectedPO.totalAmount)}</div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("purchaseOrders.part")} (SKU)</TableHead>
                      <TableHead className="text-right">{t("purchaseOrders.qty")}</TableHead>
                      <TableHead className="text-right">{t("purchaseOrders.unitCost")}</TableHead>
                      <TableHead className="text-right">{t("common.subtotal")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPO.lines?.length ? selectedPO.lines.map((line: any) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <div>{line.partName}</div>
                          <div className="text-xs text-muted-foreground font-mono">{line.partSku}</div>
                        </TableCell>
                        <TableCell className="text-right">{line.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(line.unitCost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(line.quantity * line.unitCost)}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">{t("purchaseOrders.noLineItems")}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
                {selectedPO.status === 'draft' && (
                  <Button onClick={() => confirmMutation.mutate(selectedPO.id)} className="w-full bg-orange-500 hover:bg-orange-600">{t("purchaseOrders.confirmOrder")}</Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
