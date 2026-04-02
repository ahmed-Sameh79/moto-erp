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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ImageUpload";

const schema = z.object({
  motorcycleCategoryId: z.string().optional(),
  name: z.string().min(1, "Brand name required"),
  description: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function MotorcycleBrandsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [filterCatId, setFilterCatId] = useState("all");

  const { data: categories } = useQuery({
    queryKey: ["/motorcycle-categories"],
    queryFn: () => apiFetch<any[]>("/motorcycle-categories"),
  });

  const { data: brands, isLoading } = useQuery({
    queryKey: ["/motorcycle-brands", filterCatId],
    queryFn: () => {
      const params = filterCatId !== "all" ? `?motorcycleCategoryId=${filterCatId}` : "";
      return apiFetch<any[]>(`/motorcycle-brands${params}`);
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { motorcycleCategoryId: "", name: "", description: "", imageUrl: null },
  });

  const closeDialog = () => { setIsAddOpen(false); setEditingItem(null); form.reset(); };

  const createMutation = useMutation({
    mutationFn: (v: FormValues) => apiFetch("/motorcycle-brands", {
      method: "POST",
      body: JSON.stringify({ ...v, motorcycleCategoryId: v.motorcycleCategoryId || null }),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/motorcycle-brands"] }); toast.success(t("motorcycleBrands.created")); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (v: FormValues) => apiFetch(`/motorcycle-brands/${editingItem.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...v, motorcycleCategoryId: v.motorcycleCategoryId || null }),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/motorcycle-brands"] }); toast.success(t("motorcycleBrands.updated")); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/motorcycle-brands/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/motorcycle-brands"] }); toast.success(t("motorcycleBrands.deleted")); },
    onError: (e: any) => toast.error(e.message),
  });

  const onSubmit = (v: FormValues) => editingItem ? updateMutation.mutate(v) : createMutation.mutate(v);

  const startEdit = (item: any) => {
    setEditingItem(item);
    form.reset({
      motorcycleCategoryId: item.motorcycleCategoryId ? String(item.motorcycleCategoryId) : "",
      name: item.name,
      description: item.description ?? "",
      imageUrl: item.imageUrl ?? null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("motorcycleBrands.title")}</h1>
          <p className="text-muted-foreground">{t("motorcycleBrands.subtitle")}</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />{t("motorcycleBrands.add")}
        </Button>
      </div>

      <Dialog open={isAddOpen || !!editingItem} onOpenChange={(o) => { if (!o) closeDialog(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? t("motorcycleBrands.edit") : t("motorcycleBrands.add")}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("motorcycleBrands.brandName")}</FormLabel>
                    <FormControl><Input {...field} placeholder="Honda, Yamaha, Kawasaki..." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="motorcycleCategoryId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("motorcycleCategories.title")} ({t("common.optional")})</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)} value={field.value ?? "__none__"}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={`— ${t("motorcycleCategories.title")} —`} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">{t("common.none")}</SelectItem>
                        {categories?.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.description")} ({t("common.optional")})</FormLabel>
                    <FormControl><Textarea {...field} /></FormControl>
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
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeDialog}>{t("common.cancel")}</Button>
                  <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingItem ? t("common.save") : t("common.create")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

      <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg border">
        <Select value={filterCatId} onValueChange={setFilterCatId}>
          <SelectTrigger className="w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")} {t("motorcycleCategories.title")}</SelectItem>
            {categories?.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white dark:bg-gray-800 border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">{t("common.image")}</TableHead>
              <TableHead>{t("motorcycleBrands.brandName")}</TableHead>
              <TableHead>{t("motorcycleCategories.title")}</TableHead>
              <TableHead>{t("common.description")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <TableRow key={i}>{[...Array(4)].map((_, j) => <TableCell key={j}><Skeleton className="h-6 w-full" /></TableCell>)}</TableRow>
              ))
            ) : brands?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  {t("motorcycleBrands.empty")}
                </TableCell>
              </TableRow>
            ) : (
              brands?.map((brand: any) => (
                <TableRow key={brand.id}>
                  <TableCell>
                    {brand.imageUrl
                      ? <img src={brand.imageUrl} alt={brand.name} className="h-9 w-9 rounded object-cover border" />
                      : <div className="h-9 w-9 rounded bg-muted" />
                    }
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-base">{brand.name}</div>
                  </TableCell>
                  <TableCell>
                    {brand.categoryName ? (
                      <Badge className="bg-orange-100 text-orange-700 border-orange-200">{brand.categoryName}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{brand.description || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(brand)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700"
                        onClick={() => { if (confirm(t("common.confirmDelete"))) deleteMutation.mutate(brand.id); }}>
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
