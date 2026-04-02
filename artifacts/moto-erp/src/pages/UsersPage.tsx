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
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, UserPlus, Edit, ShieldCheck, ShieldAlert } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

interface UserRecord {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: "admin" | "storekeeper" | "technician" | "sales";
  isActive: boolean;
  createdAt: string;
}

const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email"),
  role: z.enum(["admin", "storekeeper", "technician", "sales"]),
  isActive: z.boolean().default(true),
});

export default function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: users, isLoading } = useQuery({ queryKey: ["/users"], queryFn: () => apiFetch<UserRecord[]>("/users") });

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: { username: "", password: "", fullName: "", email: "", role: "sales", isActive: true },
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof userSchema>) => {
      const method = editingUser ? "PATCH" : "POST";
      const url = editingUser ? `/users/${editingUser.id}` : "/users";
      const payload = { ...values };
      if (editingUser && !payload.password) delete payload.password;
      return apiFetch(url, { method, body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/users"] });
      toast.success(editingUser ? "User updated" : "User created");
      setIsAddOpen(false);
      setEditingUser(null);
      form.reset();
    },
  });

  const startEdit = (user: UserRecord) => {
    setEditingUser(user);
    form.reset({
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
    setIsAddOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("users.title")}</h1>
          <p className="text-muted-foreground">{t("users.administerSubtitle")}</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) { setEditingUser(null); form.reset(); } }}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600"><UserPlus className="h-4 w-4 mr-2" /> {t("users.addUser")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingUser ? t("users.editUser") : t("users.addSystemUser")}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(v => mutation.mutate(v))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="username" render={({ field }) => (
                    <FormItem><FormLabel>{t("users.username")}</FormLabel><FormControl><Input {...field} disabled={!!editingUser} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem><FormLabel>{editingUser ? t("users.newPasswordOptional") : t("users.password")}</FormLabel><FormControl><Input type="password" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem><FormLabel>{t("users.fullName")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>{t("users.emailAddress")}</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("users.role")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="admin">{t("users.administrator")}</SelectItem>
                        <SelectItem value="storekeeper">{t("users.roleStorekeeper")}</SelectItem>
                        <SelectItem value="technician">{t("users.roleTechnician")}</SelectItem>
                        <SelectItem value="sales">{t("users.salesExecutive")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={mutation.isPending}>
                  {editingUser ? t("users.saveChanges") : t("users.createUser")}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("users.userCol")}</TableHead>
              <TableHead>{t("users.roleCol")}</TableHead>
              <TableHead>{t("users.statusCol")}</TableHead>
              <TableHead>{t("users.createdCol")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map(user => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="font-medium">{user.fullName}</div>
                  <div className="text-xs text-muted-foreground">@{user.username} • {user.email}</div>
                </TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{user.role}</Badge></TableCell>
                <TableCell>
                  {user.isActive ? (
                    <div className="flex items-center gap-1 text-green-600 text-xs font-bold"><ShieldCheck className="h-3 w-3" /> Active</div>
                  ) : (
                    <div className="flex items-center gap-1 text-red-600 text-xs font-bold"><ShieldAlert className="h-3 w-3" /> Inactive</div>
                  )}
                </TableCell>
                <TableCell>{formatDate(user.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(user)}><Edit className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
