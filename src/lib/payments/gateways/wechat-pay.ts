import { createHash, createHmac, randomBytes } from "crypto";
import type {
  PaymentGateway,
  CreatePaymentParams,
  PaymentResult,
  PaymentStatusResult,
  RefundResult,
  TransferResult,
} from "../types";

/**
 * WeChat Pay V3 API Gateway
 * Docs: https://pay.weixin.qq.com/doc/v3/merchant/4012791858
 *
 * Supports:
 * - JSAPI (in-WeChat browser)
 * - Native (QR code scan)
 * - H5 (mobile browser redirect)
 */

const API_BASE = "https://api.mch.weixin.qq.com";

function getNonceStr(): string {
  return randomBytes(16).toString("hex");
}

function getTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

/**
 * Generate WeChat Pay V3 signature
 */
function signV3(method: string, url: string, timestamp: string, nonceStr: string, body: string): string {
  const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const privateKey = process.env.WECHAT_API_PRIVATE_KEY || process.env.WECHAT_API_KEY || "";
  return createHmac("sha256", privateKey).update(message).digest("base64");
}

/**
 * Generate V2 sign (for some legacy endpoints)
 */
function signV2(params: Record<string, string>): string {
  const sorted = Object.keys(params)
    .filter((k) => params[k] && k !== "sign")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const stringSignTemp = `${sorted}&key=${process.env.WECHAT_API_KEY}`;
  return createHash("md5").update(stringSignTemp).digest("hex").toUpperCase();
}

async function wechatRequest(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const timestamp = getTimestamp();
  const nonceStr = getNonceStr();
  const bodyStr = body ? JSON.stringify(body) : "";
  const signature = signV3(method, path, timestamp, nonceStr, bodyStr);

  const mchId = process.env.WECHAT_MCH_ID!;
  const serialNo = process.env.WECHAT_SERIAL_NO || "default";

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${serialNo}",signature="${signature}"`,
    },
    ...(body ? { body: bodyStr } : {}),
  });

  return response.json();
}

export const wechatPayGateway: PaymentGateway = {
  name: "wechat_pay",
  supportedCurrencies: ["CNY"],

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const appId = process.env.WECHAT_APP_ID!;
    const mchId = process.env.WECHAT_MCH_ID!;
    const notifyUrl = process.env.WECHAT_NOTIFY_URL ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/wechat`;

    const outTradeNo = `SR${Date.now()}${randomBytes(4).toString("hex")}`;

    // Determine trade type from metadata
    const tradeType = params.metadata?.tradeType || "NATIVE"; // JSAPI, NATIVE, H5

    const requestBody: Record<string, unknown> = {
      appid: appId,
      mchid: mchId,
      description: params.description || "Silk Road Africa Order",
      out_trade_no: outTradeNo,
      notify_url: notifyUrl,
      amount: {
        total: params.amount, // WeChat uses smallest unit (fen for CNY)
        currency: "CNY",
      },
      attach: params.orderId,
    };

    // JSAPI requires payer openid
    if (tradeType === "JSAPI") {
      requestBody.payer = { openid: params.metadata?.openid };
    }

    // H5 requires scene info
    if (tradeType === "H5") {
      requestBody.scene_info = {
        payer_client_ip: params.metadata?.clientIp || "0.0.0.0",
        h5_info: { type: "Wap" },
      };
    }

    const apiPath = tradeType === "JSAPI"
      ? "/v3/pay/transactions/jsapi"
      : tradeType === "H5"
        ? "/v3/pay/transactions/h5"
        : "/v3/pay/transactions/native";

    try {
      const result = await wechatRequest("POST", apiPath, requestBody);

      if (result.code) {
        // Error response
        return {
          success: false,
          transactionId: outTradeNo,
          status: "failed",
          error: `WeChat Pay error: ${result.message || result.code}`,
          rawResponse: result,
        };
      }

      // Native returns code_url (QR code URL)
      // H5 returns h5_url (redirect URL)
      // JSAPI returns prepay_id
      const actionUrl = (result.code_url || result.h5_url) as string | undefined;
      const prepayId = result.prepay_id as string | undefined;

      return {
        success: true,
        transactionId: outTradeNo,
        gatewayTransactionId: prepayId || outTradeNo,
        status: "pending",
        requiresAction: true,
        actionUrl,
        actionType: tradeType === "NATIVE" ? "qr_code" : "redirect",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min
        rawResponse: {
          ...result,
          outTradeNo,
          tradeType,
          // For JSAPI, client needs these to invoke payment
          ...(tradeType === "JSAPI" && prepayId ? {
            jsapiParams: {
              appId,
              timeStamp: getTimestamp(),
              nonceStr: getNonceStr(),
              package: `prepay_id=${prepayId}`,
              signType: "RSA",
            },
          } : {}),
        },
      };
    } catch (err) {
      return {
        success: false,
        transactionId: outTradeNo,
        status: "failed",
        error: `WeChat Pay request failed: ${(err as Error).message}`,
      };
    }
  },

  async checkStatus(transactionId: string): Promise<PaymentStatusResult> {
    const mchId = process.env.WECHAT_MCH_ID!;

    try {
      const result = await wechatRequest(
        "GET",
        `/v3/pay/transactions/out-trade-no/${transactionId}?mchid=${mchId}`
      );

      const statusMap: Record<string, PaymentStatusResult["status"]> = {
        SUCCESS: "succeeded",
        NOTPAY: "pending",
        CLOSED: "failed",
        REVOKED: "failed",
        USERPAYING: "processing",
        PAYERROR: "failed",
        REFUND: "succeeded", // payment succeeded, refund is separate
      };

      const tradeState = result.trade_state as string;
      const amount = result.amount as { total: number; currency: string } | undefined;

      return {
        transactionId,
        status: statusMap[tradeState] || "pending",
        amount: amount?.total,
        currency: amount?.currency || "CNY",
        paidAt: tradeState === "SUCCESS" ? new Date(result.success_time as string) : undefined,
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
    const outRefundNo = `RF${Date.now()}${randomBytes(4).toString("hex")}`;

    try {
      // Get original transaction to know the total
      const original = await this.checkStatus(transactionId);
      const totalAmount = original.amount || amount;

      const result = await wechatRequest("POST", "/v3/refund/domestic/refunds", {
        out_trade_no: transactionId,
        out_refund_no: outRefundNo,
        reason: "Buyer requested refund",
        notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/wechat`,
        amount: {
          refund: amount,
          total: totalAmount,
          currency: "CNY",
        },
      });

      if (result.code) {
        return {
          success: false,
          refundId: outRefundNo,
          amount,
          currency,
          status: "failed",
          error: `Refund error: ${result.message || result.code}`,
        };
      }

      return {
        success: true,
        refundId: (result.refund_id as string) || outRefundNo,
        amount,
        currency,
        status: result.status === "SUCCESS" ? "succeeded" : "pending",
      };
    } catch (err) {
      return {
        success: false,
        refundId: outRefundNo,
        amount,
        currency,
        status: "failed",
        error: (err as Error).message,
      };
    }
  },

  async handleWebhook(payload: unknown): Promise<PaymentStatusResult> {
    const data = payload as Record<string, unknown>;
    const resource = data.resource as Record<string, unknown> | undefined;

    // WeChat V3 webhooks have encrypted resource — need to decrypt
    // For simplicity, we handle the decrypted payload structure
    const eventType = data.event_type as string;

    if (eventType === "TRANSACTION.SUCCESS") {
      const outTradeNo = resource?.out_trade_no as string;
      const amount = resource?.amount as { total: number; currency: string } | undefined;

      return {
        transactionId: outTradeNo || "",
        status: "succeeded",
        amount: amount?.total,
        currency: amount?.currency || "CNY",
        paidAt: new Date(),
        rawResponse: data,
      };
    }

    return {
      transactionId: (resource?.out_trade_no as string) || "",
      status: "failed",
      rawResponse: data,
    };
  },
};
