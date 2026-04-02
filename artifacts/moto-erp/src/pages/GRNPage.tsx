import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { Plus, Eye, PackageCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

const grnSchema = z.object({
  purchaseOrderId: z.string().min(1, "PO is required"),
  receivedAt: z.string().min(1, "Received date is required"),
  lines: z.array(z.object({
    partId: z.string().min(1),
    quantityReceived: z.number().min(1),
    binId: z.string().min(1, "Bin is required"),
  })),
});

export default function GRNPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedGRN, setSelectedGRN] = useState<any>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: grns } = useQuery({ queryKey: ["/grn"], queryFn: () => apiFetch<any[]>("/grn") });
  const { data: pos } = useQuery({ queryKey: ["/purchase-orders", "ordered"], queryFn: () => apiFetch<any[]>("/purchase-orders?status=ordered") });
  const { data: warehouses } = useQuery({ queryKey: ["/warehouses"], queryFn: () => apiFetch<any[]>("/warehouses") });
  const { data: bins } = useQuery({ queryKey: ["/bins"], queryFn: () => apiFetch<any[]>("/bins") });

  const form = useForm<z.infer<typeof grnSchema>>({
    resolver: zodResolver(grnSchema),
    defaultValues: { purchaseOrderId: "", receivedAt: new Date().toISOString().split('T')[0], lines: [] },
  });

  const { fields, replace } = useFieldArray({ control: form.control, name: "lines" });

  const onPOSelect = async (poId: string) => {
    const po = await apiFetch<any>(`/purchase-orders/${poId}`);
    replace(po.lines.map((l: any) => ({
      partId: String(l.partId),
      quantityReceived: l.quantity,
      binId: "",
      partName: l.partName,
      partSku: l.partSku,
    })));
  };

  const createMutation = useMutation({
    mutationFn: (values: any) => apiFetch("/grn", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/grn"] });
      queryClient.invalidateQueries({ queryKey: ["/parts"] });
      toast.success("GRN recorded and inventory updated");
      setIsAddOpen(false);
      form.reset();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("grn.title")}</h1>
          <p className="text-muted-foreground">{t("grn.subtitle")}</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600"><Plus className="h-4 w-4 mr-2" /> {t("grn.addGRN")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader><DialogTitle>{t("grn.receiveGoods")}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(v => createMutation.mutate(v))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="purchaseOrderId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("grn.purchaseOrder")}</FormLabel>
                      <Select onValueChange={(val) => { field.onChange(val); onPOSelect(val); }} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("grn.selectPO")} /></SelectTrigger></FormControl>
                        <SelectContent>{pos?.map(po => <SelectItem key={po.id} value={po.id}>{po.poNumber} ({po.vendorName})</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="receivedAt" render={({ field }) => (
                    <FormItem><FormLabel>{t("grn.receivedDate")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>{t("grn.part")}</TableHead><TableHead>{t("grn.qtyRecv")}</TableHead><TableHead>{t("grn.targetBin")}</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field: any, index) => (
                        <TableRow key={field.id}>
                          <TableCell><div className="text-sm font-medium">{field.partName}</div><div className="text-xs text-muted-foreground">{field.partSku}</div></TableCell>
                          <TableCell><FormField control={form.control} name={`lines.${index}.quantityReceived`} render={({ field }) => (
                            <FormItem><FormControl><Input className="w-20" type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl></FormItem>
                          )} /></TableCell>
                          <TableCell><FormField control={form.control} name={`lines.${index}.binId`} render={({ field }) => (
                            <FormItem>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder={t("grn.targetBin")} /></SelectTrigger></FormControl>
                                <SelectContent>{bins?.map(b => <SelectItem key={b.id} value={b.id}>{b.zone}-{b.aisle}-{b.shelf}-{b.bin}</SelectItem>)}</SelectContent>
                              </Select>
                            </FormItem>
                          )} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Button type="submit" className="w-full">{t("grn.submitGRN")}</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("grn.grnNumber")}</TableHead>
              <TableHead>{t("purchaseOrders.poNumber")}</TableHead>
              <TableHead>{t("purchaseOrders.vendor")}</TableHead>
              <TableHead>{t("grn.receivedDate")}</TableHead>
              <TableHead>{t("grn.receivedBy")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grns?.map(grn => (
              <TableRow key={grn.id}>
                <TableCell className="font-mono font-medium">{grn.grnNumber}</TableCell>
                <TableCell>{grn.poNumber}</TableCell>
                <TableCell>{grn.vendorName}</TableCell>
                <TableCell>{formatDate(grn.receivedAt)}</TableCell>
                <TableCell>{grn.receivedByName}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedGRN(grn)}><Eye className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
