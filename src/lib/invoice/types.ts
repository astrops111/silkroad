export interface InvoiceLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxAmount: number;
  hsCode?: string;
}

export interface InvoiceData {
  invoiceNumber?: string;
  invoiceType: "b2b_standard" | "proforma" | "commission" | "credit_note" | "fapiao_normal" | "fapiao_special";
  invoiceDate: string;

  // Issuer (supplier or platform)
  issuerCompanyId: string;
  issuerName: string;
  issuerTaxId?: string;
  issuerAddress?: string;
  issuerCountry: string;

  // Recipient (buyer or supplier)
  recipientCompanyId?: string;
  recipientName: string;
  recipientTaxId?: string;
  recipientAddress?: string;
  recipientCountry: string;

  // Amounts
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;

  // Tax details
  taxBreakdown?: { name: string; rate: number; amount: number }[];
  taxType: "taxable" | "zero_rated" | "exempt";

  // Line items
  lineItems: InvoiceLineItem[];

  // Order reference
  supplierOrderId?: string;
  purchaseOrderId?: string;
  orderNumber?: string;

  // Notes
  notes?: string;
  paymentTerms?: string;
}

export interface InvoiceIssueResult {
  success: boolean;
  invoiceNumber?: string;
  externalReference?: string; // ETIMS CU Invoice No, Fapiao code, etc.
  pdfUrl?: string;
  rawResponse?: unknown;
  error?: string;
}

export interface InvoiceProvider {
  name: string;
  supportedCountries: string[];
  issueInvoice(data: InvoiceData): Promise<InvoiceIssueResult>;
  voidInvoice(invoiceNumber: string, reason: string): Promise<{ success: boolean; error?: string }>;
}
