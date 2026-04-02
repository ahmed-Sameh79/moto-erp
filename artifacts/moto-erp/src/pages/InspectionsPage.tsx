import { useTranslation } from "react-i18next";
import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from "@/components/ui/dialog";
import { 
  Form, FormControl, FormField, FormItem, FormLabel 
} from "@/components/ui/form";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, CheckCircle2, XCircle, Download, Eye, Upload, X, Image } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

function generateInspectionPdf(insp: InspectionRecord): void {
  import("jspdf").then(({ jsPDF }) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(22);
    doc.setTextColor(249, 115, 22);
    doc.text("Inspection Report", 20, y);
    doc.setTextColor(0, 0, 0);
    y += 8;

    doc.setFontSize(11);
    doc.text(`${insp.year} ${insp.make} ${insp.model}`, 20, y);
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`VIN: ${insp.vin}`, 20, y);
    doc.setTextColor(0, 0, 0);
    y += 10;

    doc.setFontSize(10);
    doc.text(`Inspector: ${insp.inspectorName}`, 20, y);
    doc.text(`Date: ${formatDate(insp.createdAt)}`, pageW - 20, y, { align: "right" });
    y += 6;
    doc.text(`Overall Grade: ${insp.overallGrade.toUpperCase()}`, 20, y);
    doc.text(`Certified: ${insp.isCertified ? "YES" : "NO"}`, pageW - 20, y, { align: "right" });
    y += 12;

    const conditionRows: [string, string | undefined][] = [
      ["Engine", insp.engineCondition],
      ["Body / Frame", insp.bodyCondition],
      ["Electrical", insp.electricalCondition],
      ["Tires", insp.tiresCondition],
      ["Brakes", insp.brakeCondition],
    ];

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Condition Summary", 20, y);
    doc.setFont("helvetica", "normal");
    y += 6;

    for (const [label, val] of conditionRows) {
      if (val) {
        doc.setFontSize(10);
        doc.text(label, 20, y);
        doc.text(val.charAt(0).toUpperCase() + val.slice(1), pageW - 20, y, { align: "right" });
        y += 6;
      }
    }

    if (insp.notes) {
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.text("Notes", 20, y);
      doc.setFont("helvetica", "normal");
      y += 5;
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(insp.notes, pageW - 40);
      doc.text(lines, 20, y);
    }

    doc.save(`inspection-${insp.id}-${insp.vin}.pdf`);
  }).catch(() => {
    toast.error("PDF generation failed — try again");
  });
}

type ConditionGrade = "excellent" | "good" | "fair" | "poor";

const inspectionSchema = z.object({
  motorcycleId: z.string().min(1, "Motorcycle is required"),
  overallGrade: z.enum(["excellent", "good", "fair", "poor"]),
  engineCondition: z.enum(["excellent", "good", "fair", "poor"]).optional(),
  bodyCondition: z.enum(["excellent", "good", "fair", "poor"]).optional(),
  electricalCondition: z.enum(["excellent", "good", "fair", "poor"]).optional(),
  tiresCondition: z.enum(["excellent", "good", "fair", "poor"]).optional(),
  brakeCondition: z.enum(["excellent", "good", "fair", "poor"]).optional(),
  notes: z.string().optional(),
  isCertified: z.boolean().default(false),
});

type InspectionFormValues = z.infer<typeof inspectionSchema>;

const CONDITION_OPTIONS: ConditionGrade[] = ["excellent", "good", "fair", "poor"];
const CONDITION_FIELDS: { name: keyof InspectionFormValues; label: string }[] = [
  { name: "overallGrade", label: "Overall Grade" },
  { name: "engineCondition", label: "Engine" },
  { name: "bodyCondition", label: "Body / Frame" },
  { name: "electricalCondition", label: "Electrical" },
  { name: "tiresCondition", label: "Tires" },
  { name: "brakeCondition", label: "Brakes" },
];

interface Motorcycle {
  id: number;
  make: string;
  model: string;
  vin: string;
}

interface InspectionRecord {
  id: number;
  year: number;
  make: string;
  model: string;
  vin: string;
  inspectorName: string;
  overallGrade: string;
  engineCondition?: string;
  bodyCondition?: string;
  electricalCondition?: string;
  tiresCondition?: string;
  brakeCondition?: string;
  notes?: string;
  isCertified: boolean;
  imageUrls: string[];
  createdAt: string;
}

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function InspectionsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<InspectionRecord | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: inspections } = useQuery({ queryKey: ["/inspections"], queryFn: () => apiFetch<InspectionRecord[]>("/inspections") });
  const { data: motorcycles } = useQuery({ queryKey: ["/motorcycles"], queryFn: () => apiFetch<Motorcycle[]>("/motorcycles") });

  const form = useForm<InspectionFormValues>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: { motorcycleId: "", overallGrade: "good", notes: "", isCertified: false },
  });

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setPendingFiles(prev => [...prev, ...files]);
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setPreviewUrls(prev => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const removeFile = useCallback((index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  }, [previewUrls]);

  const createMutation = useMutation({
    mutationFn: async (values: InspectionFormValues) => {
      let imageUrls: string[] = [];

      if (pendingFiles.length > 0) {
        const formData = new FormData();
        pendingFiles.forEach(f => formData.append("images", f));
        const token = localStorage.getItem("moto_erp_token");
        const uploadRes = await fetch(`${API_BASE}/api/uploads/images`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Image upload failed");
        const { urls } = await uploadRes.json() as { urls: string[] };
        imageUrls = urls;
      }

      return apiFetch("/inspections", {
        method: "POST",
        body: JSON.stringify({ ...values, imageUrls }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/inspections"] });
      toast.success("Inspection report saved");
      setIsAddOpen(false);
      form.reset();
      setPendingFiles([]);
      previewUrls.forEach(u => URL.revokeObjectURL(u));
      setPreviewUrls([]);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to save inspection");
    },
  });

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case "excellent": return <Badge className="bg-green-600">{t("inspections.excellent")}</Badge>;
      case "good": return <Badge className="bg-blue-600">{t("inspections.good")}</Badge>;
      case "fair": return <Badge className="bg-yellow-600">{t("inspections.fair")}</Badge>;
      case "poor": return <Badge variant="destructive">{t("inspections.poor")}</Badge>;
      default: return <Badge>{grade}</Badge>;
    }
  };

  const resolveImageUrl = (url: string) =>
    url.startsWith("/uploads/") ? `${API_BASE}${url}` : url;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("inspections.title")}</h1>
          <p className="text-muted-foreground">{t("inspections.preOwnedSubtitle")}</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) {
            previewUrls.forEach(u => URL.revokeObjectURL(u));
            setPreviewUrls([]);
            setPendingFiles([]);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600"><Plus className="h-4 w-4 mr-2" /> {t("inspections.newInspection")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{t("inspections.recordInspection")}</DialogTitle>
              <DialogDescription>{t("inspections.formDescription")}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(v => createMutation.mutate(v))} className="space-y-4">
                <FormField control={form.control} name="motorcycleId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("inspections.motorcycle")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("inspections.selectMotorcycle")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {motorcycles?.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.make} {m.model} ({m.vin})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  {CONDITION_FIELDS.map(({ name, label }) => (
                    <Controller
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value as string | undefined}
                          >
                            <FormControl><SelectTrigger><SelectValue placeholder={t("inspections.selectGrade")} /></SelectTrigger></FormControl>
                            <SelectContent>
                              {CONDITION_OPTIONS.map(o => (
                                <SelectItem key={o} value={o}>
                                  {o.charAt(0).toUpperCase() + o.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                <div className="space-y-2">
                  <FormLabel>{t("inspections.inspectionPhotosLabel")}</FormLabel>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-orange-400 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm text-muted-foreground">Click to upload images (JPG, PNG, WebP — max 10MB each)</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      multiple
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                  {previewUrls.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {previewUrls.map((url, i) => (
                        <div key={i} className="relative group">
                          <img src={url} alt={`Preview ${i + 1}`} className="w-full h-20 object-cover rounded border" />
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>{t("inspections.inspectionNotes")}</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl></FormItem>
                )} />

                <FormField control={form.control} name="isCertified" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>{t("inspections.certifiedLabel")}</FormLabel>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-600"
                      />
                    </FormControl>
                  </FormItem>
                )} />

                <Button type="submit" disabled={createMutation.isPending} className="w-full bg-orange-500 hover:bg-orange-600">
                  {createMutation.isPending ? t("inspections.saving") : t("inspections.saveInspection")}
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
              <TableHead>{t("inspections.motorcycle")}</TableHead>
              <TableHead>{t("inspections.vinCol")}</TableHead>
              <TableHead>{t("inspections.inspectorCol")}</TableHead>
              <TableHead>{t("inspections.gradeCol")}</TableHead>
              <TableHead>{t("inspections.photosCol")}</TableHead>
              <TableHead>{t("inspections.certifiedCol")}</TableHead>
              <TableHead>{t("inspections.dateCol")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inspections?.map(insp => (
              <TableRow key={insp.id}>
                <TableCell className="font-medium">{insp.year} {insp.make} {insp.model}</TableCell>
                <TableCell className="font-mono text-xs">{insp.vin}</TableCell>
                <TableCell>{insp.inspectorName}</TableCell>
                <TableCell>{getGradeBadge(insp.overallGrade)}</TableCell>
                <TableCell>
                  {insp.imageUrls?.length ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Image className="h-3 w-3" />
                      {insp.imageUrls.length}
                    </div>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  {insp.isCertified ? (
                    <div className="flex items-center gap-1 text-green-600 font-bold text-xs"><CheckCircle2 className="h-3 w-3" /> YES</div>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground text-xs"><XCircle className="h-3 w-3" /> NO</div>
                  )}
                </TableCell>
                <TableCell>{formatDate(insp.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedInspection(insp)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!inspections?.length && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No inspections yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedInspection && (
        <Dialog open={!!selectedInspection} onOpenChange={() => setSelectedInspection(null)}>
          <DialogContent className="max-w-2xl print:max-w-none print:shadow-none print:border-0">
            <DialogHeader className="sr-only">
              <DialogTitle>Inspection Report</DialogTitle>
              <DialogDescription>Detailed inspection report for {selectedInspection.make} {selectedInspection.model}</DialogDescription>
            </DialogHeader>
            <div id="inspection-report" className="space-y-4 p-2 print:p-0">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-orange-600">{t("inspections.inspectionReport")}</h2>
                  <p className="text-sm text-muted-foreground">{selectedInspection.year} {selectedInspection.make} {selectedInspection.model}</p>
                  <p className="text-xs font-mono text-muted-foreground">VIN: {selectedInspection.vin}</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <QRCodeSVG
                    value={JSON.stringify({
                      insp: selectedInspection.id,
                      vin: selectedInspection.vin,
                      grade: selectedInspection.overallGrade,
                      certified: selectedInspection.isCertified,
                    })}
                    size={72}
                    level="M"
                  />
                  <span className="text-[10px] text-muted-foreground">Scan to verify</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm border-y py-3">
                <div><span className="text-muted-foreground">Inspector:</span> {selectedInspection.inspectorName}</div>
                <div><span className="text-muted-foreground">Date:</span> {formatDate(selectedInspection.createdAt)}</div>
                <div><span className="text-muted-foreground">Overall Grade:</span> {getGradeBadge(selectedInspection.overallGrade)}</div>
                <div><span className="text-muted-foreground">Certified:</span> {selectedInspection.isCertified ? <span className="text-green-600 font-bold">YES</span> : "NO"}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                {([
                  [t("inspections.engine"), selectedInspection.engineCondition],
                  [t("inspections.bodyFrame"), selectedInspection.bodyCondition],
                  [t("inspections.electrical"), selectedInspection.electricalCondition],
                  [t("inspections.tires"), selectedInspection.tiresCondition],
                  [t("inspections.brakes"), selectedInspection.brakeCondition],
                ] as [string, string | undefined][]).filter(([, v]) => v).map(([label, val]) => (
                  <div key={label} className="flex justify-between border rounded p-2">
                    <span className="text-muted-foreground">{label}</span>
                    {getGradeBadge(val!)}
                  </div>
                ))}
              </div>

              {selectedInspection.notes && (
                <div className="border rounded p-3 text-sm">
                  <p className="font-medium mb-1">Notes</p>
                  <p className="text-muted-foreground">{selectedInspection.notes}</p>
                </div>
              )}

              {selectedInspection.imageUrls?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Inspection Photos ({selectedInspection.imageUrls.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedInspection.imageUrls.map((url, i) => (
                      <img
                        key={i}
                        src={resolveImageUrl(url)}
                        alt={`Inspection photo ${i + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-center pt-2">
                <Button
                  onClick={() => selectedInspection && generateInspectionPdf(selectedInspection)}
                  className="gap-2 bg-orange-500 hover:bg-orange-600"
                >
                  <Download className="h-4 w-4" /> {t("inspections.downloadReport")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #inspection-report, #inspection-report * { visibility: visible; }
          #inspection-report { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
