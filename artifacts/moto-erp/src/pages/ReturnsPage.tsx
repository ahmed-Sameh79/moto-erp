import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, RefreshCcw } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

const returnSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  reason: z.string().min(1, "Reason is required"),
  refundAmount: z.number().min(0),
});

export default function ReturnsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: returns } = useQuery({ queryKey: ["/returns"], queryFn: () => apiFetch<any[]>("/returns") });
  const { data: invoices } = useQuery({ queryKey: ["/invoices"], queryFn: () => apiFetch<any[]>("/invoices") });

  const form = useForm<z.infer<typeof returnSchema>>({
    resolver: zodResolver(returnSchema),
    defaultValues: { invoiceId: "", reason: "", refundAmount: 0 },
  });

  const createMutation = useMutation({
    mutationFn: (values: any) => apiFetch("/returns", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/returns"] });
      toast.success("Return processed successfully");
      setIsAddOpen(false);
      form.reset();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("returns.title")}</h1>
          <p className="text-muted-foreground">{t("returns.manageReturns")}</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600"><Plus className="h-4 w-4 mr-2" /> {t("returns.recordReturn")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("returns.processReturn")}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(v => createMutation.mutate(v))} className="space-y-4">
                <FormField control={form.control} name="invoiceId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("returns.originalInvoice")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("returns.selectInvoice")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {invoices?.map(inv => <SelectItem key={inv.id} value={inv.id}>{inv.invoiceNumber} - {inv.customerName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="reason" render={({ field }) => (
                  <FormItem><FormLabel>{t("returns.reasonLabel")}</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="refundAmount" render={({ field }) => (
                  <FormItem><FormLabel>{t("returns.refundAmount")}</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem>
                )} />
                <Button type="submit" className="w-full">{t("returns.confirmReturn")}</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("returns.returnCol")}</TableHead>
              <TableHead>{t("returns.invoiceCol")}</TableHead>
              <TableHead>{t("returns.reason")}</TableHead>
              <TableHead className="text-right">{t("returns.refundCol")}</TableHead>
              <TableHead>{t("returns.dateCol")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {returns?.map(ret => (
              <TableRow key={ret.id}>
                <TableCell className="font-mono font-medium">{ret.returnNumber}</TableCell>
                <TableCell>{ret.invoiceNumber}</TableCell>
                <TableCell className="max-w-xs truncate">{ret.reason}</TableCell>
                <TableCell className="text-right font-medium text-red-600">{formatCurrency(ret.refundAmount)}</TableCell>
                <TableCell>{formatDate(ret.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
