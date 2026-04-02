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
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Trash2, ChevronDown, ChevronRight, Tag } from "lucide-react";
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
  name: z.string().min(1, "Name required"),
  description: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function MotorcycleCategoriesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const { data: categories, isLoading } = useQuery({
    queryKey: ["/motorcycle-categories"],
    queryFn: () => apiFetch<any[]>("/motorcycle-categories"),
  });

  const { data: subcategories } = useQuery({
    queryKey: ["/motorcycle-subcategories"],
    queryFn: () => apiFetch<any[]>("/motorcycle-subcategories"),
  });

  const { data: brands } = useQuery({
    queryKey: ["/motorcycle-brands"],
    queryFn: () => apiFetch<any[]>("/motorcycle-brands"),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", imageUrl: null },
  });

  const closeDialog = () => { setIsAddOpen(false); setEditingItem(null); form.reset(); };

  const createMutation = useMutation({
    mutationFn: (v: FormValues) => apiFetch("/motorcycle-categories", { method: "POST", body: JSON.stringify(v) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/motorcycle-categories"] }); toast.success(t("motorcycleCategories.created")); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (v: FormValues) => apiFetch(`/motorcycle-categories/${editingItem.id}`, { method: "PUT", body: JSON.stringify(v) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/motorcycle-categories"] }); toast.success(t("motorcycleCategories.updated")); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/motorcycle-categories/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/motorcycle-categories"] }); toast.success(t("motorcycleCategories.deleted")); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const onSubmit = (v: FormValues) => editingItem ? updateMutation.mutate(v) : createMutation.mutate(v);

  const startEdit = (item: any) => {
    setEditingItem(item);
    form.reset({ name: item.name, description: item.description ?? "", imageUrl: item.imageUrl ?? null });
  };

  const getSubsForCat = (catId: number) => subcategories?.filter((s: any) => s.motorcycleCategoryId === catId) ?? [];
  const getBrandsForCat = (catId: number) => brands?.filter((b: any) => b.motorcycleCategoryId === catId) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("motorcycleCategories.title")}</h1>
          <p className="text-muted-foreground">{t("motorcycleCategories.subtitle")}</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />{t("motorcycleCategories.add")}
        </Button>
      </div>

      <Dialog open={isAddOpen || !!editingItem} onOpenChange={(o) => { if (!o) closeDialog(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? t("motorcycleCategories.edit") : t("motorcycleCategories.add")}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.name")}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.description")}</FormLabel>
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

      <div className="bg-white dark:bg-gray-800 border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead className="w-14">{t("common.image")}</TableHead>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("common.description")}</TableHead>
              <TableHead>{t("motorcycleCategories.subcategoriesCount")}</TableHead>
              <TableHead>{t("motorcycleCategories.brandsCount")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>{[...Array(6)].map((_, j) => <TableCell key={j}><Skeleton className="h-6 w-full" /></TableCell>)}</TableRow>
              ))
            ) : categories?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t("motorcycleCategories.empty")}
                </TableCell>
              </TableRow>
            ) : (
              categories?.map((cat: any) => {
                const subs = getSubsForCat(cat.id);
                const catBrands = getBrandsForCat(cat.id);
                const isExpanded = expandedIds.has(cat.id);
                return (
                  <>
                    <TableRow key={cat.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand(cat.id)}>
                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {cat.imageUrl
                          ? <img src={cat.imageUrl} alt={cat.name} className="h-9 w-9 rounded object-cover border" />
                          : <div className="h-9 w-9 rounded bg-muted flex items-center justify-center"><Tag className="h-4 w-4 text-muted-foreground" /></div>
                        }
                      </TableCell>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{cat.description || "—"}</TableCell>
                      <TableCell><Badge variant="secondary">{subs.length}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{catBrands.length}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(cat)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700"
                            onClick={() => { if (confirm(t("common.confirmDelete"))) deleteMutation.mutate(cat.id); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (subs.length > 0 || catBrands.length > 0) && (
                      <TableRow key={`${cat.id}-exp`} className="bg-muted/30">
                        <TableCell colSpan={7} className="py-2 px-8">
                          <div className="flex gap-8 text-sm">
                            {subs.length > 0 && (
                              <div>
                                <p className="font-medium text-muted-foreground mb-1">{t("nav.motorcycleSubcategories")}</p>
                                <div className="flex flex-wrap gap-1">
                                  {subs.map((s: any) => <Badge key={s.id} variant="secondary">{s.name}</Badge>)}
                                </div>
                              </div>
                            )}
                            {catBrands.length > 0 && (
                              <div>
                                <p className="font-medium text-muted-foreground mb-1">{t("nav.motorcycleBrands")}</p>
                                <div className="flex flex-wrap gap-1">
                                  {catBrands.map((b: any) => <Badge key={b.id} className="bg-orange-100 text-orange-700">{b.name}</Badge>)}
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
