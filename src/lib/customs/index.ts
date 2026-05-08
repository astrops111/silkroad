// Customs declaration router.
//
// Routes an e-submission to the correct national customs API based on the
// destination country. Kenya → iCMS, Nigeria → NICIS2. Other countries
// return a "not_supported" result so the caller falls back to the manual
// declaration workflow already in src/lib/actions/customs.ts.
//
// Called by submitCustomsDeclaration() in src/lib/actions/customs.ts.

import { submitKenyaIDF, type IcmsDeclarationInput, type IcmsDeclarationResult } from "./kenya-icms";
import { submitNigeriaSGD, type NicisDeclarationInput, type NicisDeclarationResult } from "./nigeria-nicis";

export interface CustomsSubmissionInput {
  destinationCountry: string;

  importerTaxId: string;
  importerName: string;
  importerAddress: string;
  importerCity?: string;

  billOfLading?: string;
  containerNumbers?: string[];
  portOfEntry: string;
  portOfOrigin: string;
  shippingMethod: string;
  vesselName?: string;
  arrivalDate?: string;         // ISO date YYYY-MM-DD

  hsCodes: string[];
  goodsDescription: string;
  grossWeightKg: number;
  packageCount: number;
  cifValueUsd: number;          // whole dollars (not minor units)
  currency: string;

  supplierOrderId: string;
  shipmentId?: string;
}

export interface CustomsSubmissionResult {
  success: boolean;
  provider?: string;            // "kenya_icms" | "nigeria_nicis2" | "not_supported"
  declarationRef?: string;
  secondaryRef?: string;        // SAD number (NICIS2) or entry number (iCMS)
  rawResponse?: unknown;
  error?: string;
}

export async function submitCustomsDeclarationToAuthority(
  input: CustomsSubmissionInput,
): Promise<CustomsSubmissionResult> {
  const country = input.destinationCountry.toUpperCase();

  if (country === "KE") {
    const req: IcmsDeclarationInput = {
      importerPin: input.importerTaxId,
      importerName: input.importerName,
      importerAddress: [input.importerAddress, input.importerCity].filter(Boolean).join(", "),
      billOfLading: input.billOfLading,
      containerNumbers: input.containerNumbers,
      portOfEntry: input.portOfEntry,
      portOfOrigin: input.portOfOrigin,
      shippingMethod: input.shippingMethod,
      arrivalDate: input.arrivalDate,
      hsCodes: input.hsCodes,
      goodsDescription: input.goodsDescription,
      grossWeightKg: input.grossWeightKg,
      packageCount: input.packageCount,
      cifValueUsd: input.cifValueUsd,
      currency: input.currency,
      supplierOrderId: input.supplierOrderId,
      shipmentId: input.shipmentId,
    };
    const r: IcmsDeclarationResult = await submitKenyaIDF(req);
    return { success: r.success, provider: "kenya_icms", declarationRef: r.declarationRef, secondaryRef: r.assessmentRef, rawResponse: r.rawResponse, error: r.error };
  }

  if (country === "NG") {
    const req: NicisDeclarationInput = {
      importerTin: input.importerTaxId,
      importerName: input.importerName,
      importerAddress: input.importerAddress,
      importerCity: input.importerCity ?? "",
      billOfLading: input.billOfLading,
      containerNumbers: input.containerNumbers,
      portOfEntry: input.portOfEntry,
      portOfOrigin: input.portOfOrigin,
      shippingMethod: input.shippingMethod,
      vesselName: input.vesselName,
      arrivalDate: input.arrivalDate,
      hsCodes: input.hsCodes,
      goodsDescription: input.goodsDescription,
      grossWeightKg: input.grossWeightKg,
      packageCount: input.packageCount,
      cifValueUsd: input.cifValueUsd,
      currency: input.currency,
      supplierOrderId: input.supplierOrderId,
      shipmentId: input.shipmentId,
    };
    const r: NicisDeclarationResult = await submitNigeriaSGD(req);
    return { success: r.success, provider: "nigeria_nicis2", declarationRef: r.declarationRef, secondaryRef: r.sadRef, rawResponse: r.rawResponse, error: r.error };
  }

  return {
    success: false,
    provider: "not_supported",
    error: `No e-customs integration for "${country}". Use manual declaration workflow.`,
  };
}
