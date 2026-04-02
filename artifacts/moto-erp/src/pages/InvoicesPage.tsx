import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Eye, Download } from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";

interface InvoiceSummary {
  id: number;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  workOrderId: number | null;
  woNumber: string | null;
  status: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: string | null;
  createdAt: string;
}

interface InvoiceLine {
  id: number;
  invoiceId: number;
  partId: number | null;
  partName: string | null;
  motorcycleId: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface InvoiceDetail extends InvoiceSummary {
  qrCode: string | null;
  createdBy: number;
  lines: InvoiceLine[];
}

function getQrDataUrl(text: string): Promise<string> {
  return new Promise((resolve) => {
    const container = document.createElement("div");
    container.style.cssText = "position:absolute;left:-9999px;top:-9999px;";
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(
      <QRCodeCanvas
        value={text}
        size={128}
        ref={(canvas) => {
          if (canvas) {
            resolve(canvas.toDataURL("image/png"));
            setTimeout(() => { root.unmount(); document.body.removeChild(container); }, 0);
          }
        }}
      />
    );
  });
}

function generateInvoicePdf(invoice: InvoiceDetail): void {
  const qrText = invoice.qrCode ?? `INV:${invoice.invoiceNumber}`;
  getQrDataUrl(qrText).then((qrDataUrl) => import("jspdf").then(({ jsPDF }) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(22);
    doc.setTextColor(249, 115, 22);
    doc.text("MotoERP Receipt", 20, y);
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(10);
    doc.text(`Invoice: ${invoice.invoiceNumber}`, pageW - 20, y, { align: "right" });
    y += 7;
    doc.text(formatDateTime(invoice.createdAt), pageW - 20, y, { align: "right" });
    y += 14;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Customer", 20, y);
    doc.setFont("helvetica", "normal");
    y += 6;
    doc.setFontSize(10);
    doc.text(invoice.customerName, 20, y);
    y += 5;
    if (invoice.customerPhone) doc.text(invoice.customerPhone, 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.text(`Payment Method: ${invoice.paymentMethod ?? "Cash"}`, 20, y);
    doc.text(`Status: ${invoice.status.toUpperCase()}`, pageW - 20, y, { align: "right" });
    y += 10;

    doc.setDrawColor(200, 200, 200);
    doc.line(20, y, pageW - 20, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Item", 20, y);
    doc.text("Qty", 120, y, { align: "right" });
    doc.text("Unit Price", 150, y, { align: "right" });
    doc.text("Total", pageW - 20, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 5;
    doc.line(20, y, pageW - 20, y);
    y += 6;

    for (const line of invoice.lines) {
      const label = line.partName ?? line.description ?? "Item";
      doc.text(label.slice(0, 50), 20, y);
      doc.text(String(line.quantity), 120, y, { align: "right" });
      doc.text(formatCurrency(line.unitPrice), 150, y, { align: "right" });
      doc.text(formatCurrency(line.totalPrice), pageW - 20, y, { align: "right" });
      y += 7;
    }

    y += 3;
    doc.line(20, y, pageW - 20, y);
    y += 8;

    const subtotal = parseFloat(String(invoice.subtotal));
    const tax = parseFloat(String(invoice.taxAmount));
    const total = parseFloat(String(invoice.totalAmount));

    doc.setFontSize(10);
    doc.text("Subtotal", 130, y);
    doc.text(formatCurrency(subtotal), pageW - 20, y, { align: "right" });
    y += 6;
    doc.text("Tax (6%)", 130, y);
    doc.text(formatCurrency(tax), pageW - 20, y, { align: "right" });
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("TOTAL", 130, y);
    doc.setTextColor(249, 115, 22);
    doc.text(formatCurrency(total), pageW - 20, y, { align: "right" });
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    y += 16;

    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for your business!", 20, y);
    y += 5;
    doc.text("Goods sold are not refundable unless faulty.", 20, y);
    y += 10;

    doc.addImage(qrDataUrl, "PNG", 20, y, 30, 30);
    doc.setFontSize(7);
    doc.text("Scan to verify", 23, y + 33);

    doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
  })).catch(() => {
    toast.error("PDF generation failed — try again");
  });
}

export default function InvoicesPage() {
  const { t } = useTranslation();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

  const { data: invoices } = useQuery({
    queryKey: ["/invoices"],
    queryFn: () => apiFetch<InvoiceSummary[]>("/invoices"),
  });

  const { data: selectedInvoice, isLoading: invoiceLoading } = useQuery({
    queryKey: ["/invoices", selectedInvoiceId],
    queryFn: () => apiFetch<InvoiceDetail>(`/invoices/${selectedInvoiceId!}`),
    enabled: !!selectedInvoiceId,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("invoices.title")}</h1>
          <p className="text-muted-foreground">{t("invoices.viewSubtitle")}</p>
        </div>
      </div>

      <div className="bg-white border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("invoices.invoiceNumber")}</TableHead>
              <TableHead>{t("invoices.customer")}</TableHead>
              <TableHead>{t("invoices.workOrderCol")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-right">{t("invoices.total")}</TableHead>
              <TableHead>{t("invoices.dateCol")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices?.map(invoice => (
              <TableRow key={invoice.id}>
                <TableCell className="font-mono font-medium">{invoice.invoiceNumber}</TableCell>
                <TableCell>
                  <div className="font-medium">{invoice.customerName}</div>
                  <div className="text-xs text-muted-foreground">{invoice.customerPhone}</div>
                </TableCell>
                <TableCell>{invoice.woNumber ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant={invoice.status === "paid" ? "default" : "outline"}>{invoice.status}</Badge>
                </TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(invoice.totalAmount)}</TableCell>
                <TableCell>{formatDate(invoice.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedInvoiceId(invoice.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!invoices?.length && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No invoices yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedInvoiceId && (
        <Dialog open={!!selectedInvoiceId} onOpenChange={() => setSelectedInvoiceId(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("invoices.receipt")}</DialogTitle>
              <DialogDescription>{t("invoices.receiptSubtitle")}</DialogDescription>
            </DialogHeader>
            {invoiceLoading || !selectedInvoice ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground">Loading invoice…</div>
            ) : (
              <div className="space-y-6 p-4" id="receipt">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-orange-600">{t("invoices.receiptTitle")}</h2>
                    <p className="text-sm text-muted-foreground">{t("invoices.dealerSubtitle")}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-lg">{selectedInvoice.invoiceNumber}</div>
                    <div className="text-xs text-muted-foreground">{formatDateTime(selectedInvoice.createdAt)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 py-4 border-y">
                  <div>
                    <div className="text-xs font-bold uppercase text-muted-foreground mb-1">{t("invoices.customer")}</div>
                    <div className="font-medium">{selectedInvoice.customerName}</div>
                    <div className="text-sm">{selectedInvoice.customerPhone}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold uppercase text-muted-foreground mb-1">{t("invoices.paymentMethodHeader")}</div>
                    <div className="font-medium capitalize">{selectedInvoice.paymentMethod ?? "Cash"}</div>
                    <div className="text-sm">{t("invoices.statusLabel")}: <span className="font-bold uppercase">{selectedInvoice.status}</span></div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("invoices.item")}</TableHead>
                      <TableHead className="text-right">{t("invoices.qty")}</TableHead>
                      <TableHead className="text-right">{t("common.price")}</TableHead>
                      <TableHead className="text-right">{t("common.total")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.lines?.map((line, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <div className="font-medium">{line.partName ?? line.description ?? "Item"}</div>
                        </TableCell>
                        <TableCell className="text-right">{line.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(line.unitPrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(line.totalPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t("common.subtotal")}</span>
                      <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{t("invoices.tax")}</span>
                      <span>{formatCurrency(selectedInvoice.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-bold text-lg">{t("common.total")}</span>
                      <span className="font-black text-xl text-orange-600">{formatCurrency(selectedInvoice.totalAmount)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-start pt-8 border-t">
                  <div className="text-xs text-muted-foreground">
                    <p>{t("invoices.thankYou")}</p>
                    <p>{t("invoices.refundPolicy")}</p>
                    <p className="mt-2 font-mono text-[10px] text-gray-400">{selectedInvoice.invoiceNumber}</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <QRCodeSVG
                      value={JSON.stringify({
                        inv: selectedInvoice.invoiceNumber,
                        total: selectedInvoice.totalAmount,
                        customer: selectedInvoice.customerName,
                      })}
                      size={80}
                      level="M"
                    />
                    <span className="text-[10px] text-muted-foreground">Scan to verify</span>
                  </div>
                </div>

                <div className="flex justify-center pt-4">
                  <Button onClick={() => generateInvoicePdf(selectedInvoice)} className="gap-2 bg-orange-500 hover:bg-orange-600">
                    <Download className="h-4 w-4" /> {t("invoices.downloadPdf")}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
