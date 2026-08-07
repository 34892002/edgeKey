import { externalServiceError, isAppError } from "../../lib/app-error";
import { logger } from "../../lib/logger";
import type { PaymentProviderAdapter, CreatePaymentInput, CreatePaymentResult, VerifyNotifyResult } from "./provider";

interface HashpayConfig {
  baseUrl: string;
  hashpayMerchantId?: string;
  hashpayPrivateKey?: string;
  hashpayCurrency?: string;
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

/**
 * Normalize PEM string: handle escaped newlines and various formats
 */
function normalizePem(pem: string): string {
  let normalized = pem
    // Handle escaped newlines from JSON/database storage
    .replace(/\\n/g, "\n")
    // Handle literal \n (backslash + n) stored as text
    .replace(/(?<!\\)\\n/g, "\n")
    .trim();

  // Detect public key — user likely copied the wrong key
  if (/BEGIN PUBLIC KEY/.test(normalized)) {
    throw new Error(
      "检测到输入的是公钥（PUBLIC KEY），请使用私钥（PRIVATE KEY）。" +
      "私钥在 HashPay 创建商户时显示一次，格式为 '-----BEGIN PRIVATE KEY-----'。" +
      "如已丢失，请在 HashPay 后台轮换密钥。"
    );
  }

  // Convert PKCS#1 RSA PRIVATE KEY to PKCS#8 if needed
  // (Web Crypto only accepts PKCS#8)
  if (/BEGIN RSA PRIVATE KEY/.test(normalized)) {
    throw new Error(
      "私钥格式为 PKCS#1（RSA PRIVATE KEY），需要转换为 PKCS#8。" +
      "执行: openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in rsa.key -out pkcs8.key"
    );
  }

  return normalized;
}

/**
 * Import RSA private key from PEM format for signing (RSASSA-PKCS1-v1_5)
 */
async function importSigningKey(pem: string): Promise<CryptoKey> {
  const normalized = normalizePem(pem);
  // Remove PEM headers/footers and decode base64
  const pemBody = normalized
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

/**
 * Import RSA private key from PEM format for decryption (RSA-OAEP)
 */
async function importDecryptionKey(pem: string): Promise<CryptoKey> {
  const normalized = normalizePem(pem);
  const pemBody = normalized
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"]
  );
}

/**
 * Sign request using RSA-SHA256 (RSASSA-PKCS1-v1_5)
 * Signature payload: METHOD\nPATH\nTIMESTAMP\nBODY
 */
async function signRequest(method: string, path: string, timestamp: string, body: string, privateKey: CryptoKey): Promise<string> {
  const payload = `${method}\n${path}\n${timestamp}\n${body}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(payload)
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Decrypt HashPay callback envelope
 * Uses RSA-OAEP-256 + AES-256-GCM
 */
async function decryptCallbackEnvelope(
  envelope: { alg: string; key: string; iv: string; data: string },
  privateKey: CryptoKey
): Promise<{ timestamp: number; payload: Record<string, any> }> {
  // 1. Decrypt AES key with RSA-OAEP
  const encryptedKey = Uint8Array.from(atob(envelope.key), (c) => c.charCodeAt(0));
  const aesKeyRaw = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedKey
  );

  // 2. Import AES key for AES-256-GCM
  const aesKey = await crypto.subtle.importKey(
    "raw",
    aesKeyRaw,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  // 3. Decrypt data with AES-256-GCM
  const iv = Uint8Array.from(atob(envelope.iv), (c) => c.charCodeAt(0));
  const encryptedData = Uint8Array.from(atob(envelope.data), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encryptedData
  );

  // 4. Parse decrypted JSON
  const plaintext = new TextDecoder().decode(decrypted);
  return JSON.parse(plaintext) as { timestamp: number; payload: Record<string, any> };
}

export function createHashpayAdapter(config: HashpayConfig): PaymentProviderAdapter {
  return {
    async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
      if (!config.baseUrl || !config.hashpayMerchantId || !config.hashpayPrivateKey) {
        throw externalServiceError("HashPay 配置不完整", "HASHPAY_CONFIG_INCOMPLETE");
      }

      const privateKey = await importSigningKey(config.hashpayPrivateKey);
      const path = "/api/merchant/new";
      const timestamp = Math.floor(Date.now() / 1000).toString();

      const requestBody = JSON.stringify({
        merchantNo: input.orderNo,
        amount: input.amount / 100, // 转换为元
        currency: config.hashpayCurrency?.trim() || "CNY",
        description: input.productName,
        return_url: input.returnUrl,
      });

      const signature = await signRequest("POST", path, timestamp, requestBody, privateKey);

      type HashpayResponse = {
        checkoutUrl?: string;
        order?: {
          id?: string;
          amount?: number;
          currency?: string;
          status?: string;
        };
        reused?: boolean;
        error?: {
          key?: string;
          params?: Record<string, any>;
        };
      };

      let json: HashpayResponse;
      try {
        const response = await fetch(`${normalizeBaseUrl(config.baseUrl)}${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Merchant-Id": config.hashpayMerchantId,
            "X-Timestamp": timestamp,
            "X-Signature": signature,
          },
          body: requestBody,
        });
        const responseText = await response.text();

        try {
          json = JSON.parse(responseText) as HashpayResponse;
        } catch {
          const responsePreview = responseText.replace(/\s+/g, " ").trim().slice(0, 300);
          logger.warn("hashpay.invalid_response", {
            status: response.status,
            contentType: response.headers.get("content-type"),
            responsePreview,
          });
          throw externalServiceError(
            `HashPay 网关返回非 JSON 响应（HTTP ${response.status}）：${responsePreview || "空响应"}`,
            "HASHPAY_INVALID_RESPONSE"
          );
        }
      } catch (err) {
        if (isAppError(err)) {
          throw err;
        }
        throw externalServiceError(
          `HashPay 请求失败: ${err instanceof Error ? err.message : String(err)}`,
          "HASHPAY_INVALID_RESPONSE"
        );
      }

      if (!json.checkoutUrl) {
        throw externalServiceError(
          json.error?.key || "HashPay 创建支付失败",
          "HASHPAY_CREATE_PAYMENT_FAILED"
        );
      }

      return {
        payUrl: json.checkoutUrl,
        paymentOrderNo: json.order?.id,
        raw: json,
      };
    },

    async verifyNotify(payload: Record<string, string>): Promise<VerifyNotifyResult> {
      if (!config.hashpayPrivateKey) {
        return {
          isValid: false,
          raw: payload,
          message: "missing private key",
        };
      }

      logger.info("hashpay.verify_notify", { payload });

      try {
        const privateKey = await importDecryptionKey(config.hashpayPrivateKey);

        // Parse encrypted envelope from raw body
        const rawBody = payload.__raw_body ?? "";
        let envelope: { alg: string; key: string; iv: string; data: string };
        try {
          envelope = JSON.parse(rawBody);
        } catch {
          return { isValid: false, raw: payload, message: "Invalid JSON envelope" };
        }

        // Decrypt envelope
        const decrypted = await decryptCallbackEnvelope(envelope, privateKey);

        // Verify timestamp (within 5 minutes)
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - decrypted.timestamp) > 300) {
          return { isValid: false, raw: payload, message: "Timestamp expired" };
        }

        const { payload: orderData } = decrypted;
        const status = orderData.status === "paid" ? "PAID" : orderData.status === "expired" ? "FAILED" : "PENDING";

        return {
          isValid: true,
          orderNo: orderData.merchantNo,
          paymentOrderNo: orderData.orderId,
          amount: orderData.amount ? Math.round(Number(orderData.amount) * 100) : undefined,
          status,
          raw: { ...payload, ...orderData },
        };
      } catch (error) {
        logger.error(error instanceof Error ? error : new Error(String(error)), {
          event: "hashpay.decrypt_failed",
        });
        return {
          isValid: false,
          raw: payload,
          message: `Decrypt failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  };
}
