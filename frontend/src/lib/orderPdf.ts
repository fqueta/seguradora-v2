import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Order, OrderItem } from "@/types/orders";

type TemplateType = "receipt" | "kitchen";

function currencyBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

function drawHeader(doc: jsPDF, order: Order, template: TemplateType) {
  const title = template === "kitchen" ? "Comanda de Cozinha" : "Recibo de Pedido";
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  const meta = `#${order.id} • ${order.token || ""} • Prioridade: ${(order.priority || "normal").toUpperCase()}`;
  doc.text(meta, 14, 24);
  if ((order as any).mesaId) {
    doc.text(`Mesa: ${(order as any).mesaId}`, 14, 29);
  }
}

function drawCustomer(doc: jsPDF, order: Order) {
  doc.setFontSize(12);
  doc.text("Cliente", 14, 40);
  doc.setFontSize(10);
  doc.text(order.customer.name || "", 14, 46);
  doc.setTextColor(100);
  doc.text(order.customer.phone || "", 14, 51);
  doc.setTextColor(0);
}

function drawFulfillmentPayment(doc: jsPDF, order: Order, template: TemplateType) {
  if (template === "kitchen") return;
  doc.setFontSize(12);
  doc.text("Atendimento", 110, 40);
  doc.setFontSize(10);
  doc.text(order.fulfillmentType === "delivery" ? "Entrega" : "Retirada", 110, 46);
  doc.setFontSize(12);
  doc.text("Pagamento", 110, 54);
  doc.setFontSize(10);
  const pm = order.paymentMethod === "card" ? "Cartão" : order.paymentMethod === "cash" ? "Dinheiro" : "PIX";
  doc.text(pm, 110, 60);
}

function drawAddress(doc: jsPDF, order: Order, template: TemplateType) {
  const addr = order.customer.address;
  if (template === "kitchen" || !addr) return;
  doc.setFontSize(12);
  doc.text("Endereço de Entrega", 14, 70);
  doc.setFontSize(10);
  const line1 = `${addr?.street || ""} ${addr?.number || ""} ${addr?.complement ? ", " + addr?.complement : ""}`.trim();
  const line2 = `${addr?.neighborhood || ""} - ${addr?.city || ""} ${addr?.state || ""}`.trim();
  const line3 = `${addr?.zip || ""}`.trim();
  doc.text(line1, 14, 76);
  doc.text(line2, 14, 81);
  doc.text(line3, 14, 86);
}

function drawItems(doc: jsPDF, items: OrderItem[], totalAmount?: number) {
  autoTable(doc, {
    startY: 96,
    head: [["Item", "Qtd.", "Unit.", "Total"]],
    body: items.map((it) => [
      it.title || `#${it.productId}`,
      String(it.quantity),
      currencyBRL(Number(it.unitPrice)),
      currencyBRL(Number(it.quantity) * Number(it.unitPrice)),
    ]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [245, 245, 245], textColor: 0 },
  });
  const finalY = (doc as any).lastAutoTable.finalY || 96;
  doc.setFontSize(12);
  doc.text(`Total: ${currencyBRL(Number(totalAmount || 0))}`, 180, finalY + 10, { align: "right" });
  return finalY + 16;
}

function drawNotes(doc: jsPDF, order: Order, template: TemplateType, startY: number) {
  let y = startY;
  if (order.notes) {
    doc.setFontSize(12);
    doc.text("Observações", 14, y);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(order.notes || "", 14, y + 6);
    doc.setTextColor(0);
    y += 16;
  }
  if (order.adminNotes) {
    doc.setFontSize(12);
    doc.text("Notas Administrativas", 14, y);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(order.adminNotes || "", 14, y + 6);
    doc.setTextColor(0);
    y += 16;
  }
  if (template === "kitchen" && order.kitchenNotes) {
    doc.setFontSize(12);
    doc.text("Notas da Cozinha", 14, y);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(order.kitchenNotes || "", 14, y + 6);
    doc.setTextColor(0);
    y += 16;
  }
}

export async function buildOrderPdf(order: Order, opts?: { template?: TemplateType; copies?: number }): Promise<Blob> {
  const template = opts?.template || "receipt";
  const copies = Math.max(1, opts?.copies || 1);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pages: jsPDF[] = [];
  for (let i = 0; i < copies; i++) {
    if (i > 0) doc.addPage();
    drawHeader(doc, order, template);
    drawCustomer(doc, order);
    drawFulfillmentPayment(doc, order, template);
    drawAddress(doc, order, template);
    const nextY = drawItems(doc, order.items || [], order.totalAmount);
    drawNotes(doc, order, template, nextY);
  }
  const blob = doc.output("blob");
  return blob;
}
