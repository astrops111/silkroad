import { createSign, createVerify, randomBytes } from "crypto";
import type {
  PaymentGateway,
  CreatePaymentParams,
  PaymentResult,
  PaymentStatusResult,
  RefundResult,
  TransferResult,
} from "../types";

/**
 * Alipay Open Platform Gateway
 * Docs: https://opendocs.alipay.com/open/270/105899
 *
 * Supports:
 * - alipay.trade.page.pay (PC browser)
 * - alipay.trade.wap.pay (mobile browser)
 * - alipay.trade.app.pay (mobile app)
 */

const GATEWAY_URL = "https://openapi.alipay.com/gateway.do";
const SANDBOX_URL = "https://openapi-sandbox.dl.alipaydev.com/gateway.do";

function getGatewayUrl(): string {
  return process.env.ALIPAY_ENVIRONMENT === "sandbox" ? SANDBOX_URL : GATEWAY_URL;
}

function formatDate(date: Date): string {
  return date.toISOString().replace("T", " ").substring(0, 19);
}

/**
 * Sign request parameters with RSA2 (SHA256withRSA)
 */
function signRequest(params: Record<string, string>): string {
  const sorted = Object.keys(params)
    .filter((k) => params[k] && k !== "sign")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const privateKey = process.env.ALIPAY_PRIVATE_KEY!;
  const formattedKey = privateKey.includes("BEGIN")
    ? privateKey
    : `-----BEGIN RSA PRIVATE KEY-----\n${privateKey}\n-----END RSA PRIVATE KEY-----`;

  const sign = createSign("RSA-SHA256");
  sign.update(sorted);
  return sign.sign(formattedKey, "base64");
}

/**
 * Verify Alipay callback signature
 */
function verifySignature(params: Record<string, string>, signature: string): boolean {
  const sorted = Object.keys(params)
    .filter((k) => params[k] && k !== "sign" && k !== "sign_type")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const alipayPublicKey = process.env.ALIPAY_ALIPAY_PUBLIC_KEY!;
  const formattedKey = alipayPublicKey.includes("BEGIN")
    ? alipayPublicKey
    : `-----BEGIN PUBLIC KEY-----\n${alipayPublicKey}\n-----END PUBLIC KEY-----`;

  const verify = createVerify("RSA-SHA256");
  verify.update(sorted);
  return verify.verify(formattedKey, signature, "base64");
}

/**
 * Build common request parameters
 */
function buildCommonParams(method: string, bizContent: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {
    app_id: process.env.ALIPAY_APP_ID!,
    method,
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: formatDate(new Date()),
    version: "1.0",
    biz_content: JSON.stringify(bizContent),
  };

  const notifyUrl = process.env.ALIPAY_NOTIFY_URL ||
    `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/alipay`;
  params.notify_url = notifyUrl;

  params.sign = signRequest(params);
  return params;
}

/**
 * Execute Alipay API call
 */
async function alipayRequest(
  method: string,
  bizContent: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const params = buildCommonParams(method, bizContent);

  const body = new URLSearchParams(params);
  const response = await fetch(getGatewayUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: body.toString(),
  });

  const text = await response.text();
  try {
    const json = JSON.parse(text);
    // Alipay wraps response in method-specific key
    const responseKey = method.replace(/\./g, "_") + "_response";
    return json[responseKey] || json;
  } catch {
    return { code: "PARSE_ERROR", msg: text };
  }
}

export const alipayGateway: PaymentGateway = {
  name: "alipay",
  supportedCurrencies: ["CNY"],

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const outTradeNo = `SR${Date.now()}${randomBytes(4).toString("hex")}`;
    const payType = params.metadata?.payType || "page"; // page, wap, app

    const bizContent: Record<string, unknown> = {
      out_trade_no: outTradeNo,
      total_amount: (params.amount / 100).toFixed(2), // Alipay uses yuan, not fen
      subject: params.description || "Silk Road Africa Order",
      product_code: payType === "wap" ? "QUICK_WAP_WAY" : "FAST_INSTANT_TRADE_PAY",
      passback_params: encodeURIComponent(params.orderId),
    };

    // Timeout
    bizContent.timeout_express = "30m";

    const method = payType === "wap"
      ? "alipay.trade.wap.pay"
      : payType === "app"
        ? "alipay.trade.app.pay"
        : "alipay.trade.page.pay";

    if (payType === "page" || payType === "wap") {
      // For page/wap pay, we need to build a redirect URL
      const returnUrl = params.returnUrl ||
        `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?orderId=${params.orderId}`;

      const allParams = buildCommonParams(method, bizContent);
      allParams.return_url = returnUrl;
      allParams.sign = signRequest(allParams);

      // Build redirect URL
      const queryString = Object.entries(allParams)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("&");

      const redirectUrl = `${getGatewayUrl()}?${queryString}`;

      return {
        success: true,
        transactionId: outTradeNo,
        status: "pending",
        requiresAction: true,
        actionUrl: redirectUrl,
        actionType: "redirect",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        rawResponse: { outTradeNo, method, redirectUrl: redirectUrl.substring(0, 100) + "..." },
      };
    }

    // For app pay, return the signed string for the SDK
    const appParams = buildCommonParams(method, bizContent);
    const orderString = Object.entries(appParams)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");

    return {
      success: true,
      transactionId: outTradeNo,
      status: "pending",
      requiresAction: true,
      actionType: "redirect",
      rawResponse: { outTradeNo, orderString },
    };
  },

  async checkStatus(transactionId: string): Promise<PaymentStatusResult> {
    try {
      const result = await alipayRequest("alipay.trade.query", {
        out_trade_no: transactionId,
      });

      if (result.code !== "10000") {
        return {
          transactionId,
          status: "failed",
          rawResponse: result,
        };
      }

      const statusMap: Record<string, PaymentStatusResult["status"]> = {
        WAIT_BUYER_PAY: "pending",
        TRADE_CLOSED: "failed",
        TRADE_SUCCESS: "succeeded",
        TRADE_FINISHED: "succeeded",
      };

      const tradeStatus = result.trade_status as string;
      const totalAmount = parseFloat(result.total_amount as string) * 100; // Convert yuan to fen

      return {
        transactionId,
        status: statusMap[tradeStatus] || "pending",
        amount: Math.round(totalAmount),
        currency: "CNY",
        paidAt: tradeStatus === "TRADE_SUCCESS"
          ? new Date(result.send_pay_date as string)
          : undefined,
        rawResponse: result,
      };
    } catch (err) {
      return {
        transactionId,
        status: "failed",
        rawResponse: { error: (err as Error).message },
      };
    }
  },

  async refund(
    transactionId: string,
    amount: number,
    currency: string
  ): Promise<RefundResult> {
    const outRequestNo = `RF${Date.now()}${randomBytes(4).toString("hex")}`;

    try {
      const result = await alipayRequest("alipay.trade.refund", {
        out_trade_no: transactionId,
        refund_amount: (amount / 100).toFixed(2), // yuan
        out_request_no: outRequestNo,
        refund_reason: "Buyer requested refund",
      });

      if (result.code === "10000") {
        return {
          success: true,
          refundId: (result.trade_no as string) || outRequestNo,
          amount,
          currency,
          status: "succeeded",
        };
      }

      return {
        success: false,
        refundId: outRequestNo,
        amount,
        currency,
        status: "failed",
        error: `Alipay refund error: ${result.msg || result.sub_msg || result.code}`,
      };
    } catch (err) {
      return {
        success: false,
        refundId: outRequestNo,
        amount,
        currency,
        status: "failed",
        error: (err as Error).message,
      };
    }
  },

  async handleWebhook(payload: unknown): Promise<PaymentStatusResult> {
    const params = payload as Record<string, string>;

    // Verify signature
    const signature = params.sign;
    if (signature && !verifySignature(params, signature)) {
      return {
        transactionId: params.out_trade_no || "",
        status: "failed",
        rawResponse: { error: "Invalid signature" },
      };
    }

    const tradeStatus = params.trade_status;
    const outTradeNo = params.out_trade_no;
    const totalAmount = parseFloat(params.total_amount || "0") * 100;

    if (tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED") {
      return {
        transactionId: outTradeNo,
        status: "succeeded",
        amount: Math.round(totalAmount),
        currency: "CNY",
        paidAt: new Date(),
        rawResponse: params,
      };
    }

    if (tradeStatus === "TRADE_CLOSED") {
      return {
        transactionId: outTradeNo,
        status: "failed",
        rawResponse: params,
      };
    }

    return {
      transactionId: outTradeNo || "",
      status: "pending",
      rawResponse: params,
    };
  },

  // Alipay Transfer (for supplier payouts)
  async transfer(params): Promise<TransferResult> {
    const outBizNo = `TR${Date.now()}${randomBytes(4).toString("hex")}`;

    try {
      const result = await alipayRequest("alipay.fund.trans.uni.transfer", {
        out_biz_no: outBizNo,
        trans_amount: (params.amount / 100).toFixed(2),
        product_code: "TRANS_ACCOUNT_NO_PWD",
        biz_scene: "DIRECT_TRANSFER",
        payee_info: {
          identity: params.recipientAccountId, // Alipay account
          identity_type: "ALIPAY_LOGON_ID",
        },
        remark: params.reference,
      });

      if (result.code === "10000") {
        return {
          success: true,
          transferId: (result.order_id as string) || outBizNo,
          amount: params.amount,
          currency: params.currency,
          status: "succeeded",
        };
      }

      return {
        success: false,
        transferId: outBizNo,
        amount: params.amount,
        currency: params.currency,
        status: "failed",
        error: `Transfer error: ${result.msg || result.sub_msg}`,
      };
    } catch (err) {
      return {
        success: false,
        transferId: outBizNo,
        amount: params.amount,
        currency: params.currency,
        status: "failed",
        error: (err as Error).message,
      };
    }
  },
};
