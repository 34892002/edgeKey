import { getContext } from "telefunc";
import type { PrismaClient } from "../../generated/prisma/client";
import { badRequestError, conflictError, externalServiceError, notFoundError } from "../../lib/app-error";
import { logger } from "../../lib/logger";
import { validatePaymentConfigInput } from "../../lib/validators/payment";
import { getAdminContext, logAdminOperation } from "../auth/service";
import { notifyOrderPaid } from "../email/service";
import { getSiteSetting } from "../site/service";
import { createPaymentLogRecord, getPaymentConfigRecord, listPaymentConfigRecords, upsertPaymentConfigRecord } from "./repository";
import type { PaymentMethodItem, PaymentProvider } from "./types";
import type { PaymentConfigValue } from "./types";
import { createBepusdtAdapter } from "./bepusdt";
import { createEpayAdapter } from "./epay";
import { createAlipayAdapter, queryAlipayTrade } from "./alipay";
import { createAlipayFaceAdapter } from "./alipay-face";
import { createStripeAdapter } from "./stripe";
import { createHashpayAdapter } from "./hashpay";
import { deliverOrder } from "../delivery/service";
import { findOrderRecord, updateOrderPayment } from "../order/repository";
import { DEFAULT_EPAY_CHANNELS, normalizeEpayChannels, resolveEpayChannel } from "./epay-channels";

const defaultPaymentConfigs: Record<PaymentProvider, PaymentConfigValue> = {
  BEPUSDT: {
    provider: "BEPUSDT",
    name: "BEpusdt",
    isEnabled: false,
    baseUrl: "",
    appId: "",
    appSecret: "",
    notifyUrl: "/api/payments/bepusdt/notify",
    returnUrl: "/order/{orderNo}?token={token}",
  },
  EPAY: {
    provider: "EPAY",
    name: "聚合支付",
    isEnabled: false,
    baseUrl: "",
    pid: "",
    key: "",
    epayChannels: [...DEFAULT_EPAY_CHANNELS],
    notifyUrl: "/api/payments/epay/notify",
    returnUrl: "/order/{orderNo}?token={token}",
  },
  ALIPAY: {
    provider: "ALIPAY",
    name: "支付宝",
    isEnabled: false,
    baseUrl: "https://openapi.alipay.com",
    alipayAppId: "",
    alipayPrivateKey: "",
    alipayPublicKey: "",
    notifyUrl: "/api/payments/alipay/notify",
    returnUrl: "/order/{orderNo}?token={token}",
  },
  ALIPAY_FACE: {
    provider: "ALIPAY_FACE",
    name: "支付宝当面付",
    isEnabled: false,
    baseUrl: "https://openapi.alipay.com",
    alipayAppId: "",
    alipayPrivateKey: "",
    alipayPublicKey: "",
    notifyUrl: "/api/payments/alipay-face/notify",
    returnUrl: "",
  },
  STRIPE: {
    provider: "STRIPE",
    name: "Stripe",
    isEnabled: false,
    baseUrl: "https://api.stripe.com",
    stripeSecretKey: "",
    stripeWebhookSecret: "",
    stripeCurrency: "cny",
    notifyUrl: "/api/payments/stripe/notify",
    returnUrl: "/order/{orderNo}?token={token}",
  },
  FREE_PAY: {
    provider: "FREE_PAY",
    name: "免费下单",
    isEnabled: false,
    baseUrl: "",
    notifyUrl: "/api/payments/free/notify",
    returnUrl: "/order/{orderNo}?token={token}",
  },
  HASHPAY: {
    provider: "HASHPAY",
    name: "HashPay",
    isEnabled: false,
    baseUrl: "",
    hashpayMerchantId: "",
    hashpayPrivateKey: "",
    hashpayCurrency: "CNY",
    notifyUrl: "/api/payments/hashpay/notify",
    returnUrl: "/order/{orderNo}?token={token}",
  },
};

function getPaymentContext() {
  return getContext<{ prisma: PrismaClient }>();
}

function normalizePaymentConfig(record: Awaited<ReturnType<typeof getPaymentConfigRecord>>, provider: PaymentProvider): PaymentConfigValue {
  const defaults = defaultPaymentConfigs[provider];
  if (!record) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(record.configJson) as Partial<PaymentConfigValue>;
    const value = {
      ...defaults,
      ...parsed,
      provider,
      name: record.name,
      isEnabled: record.isEnabled,
    };
    if (provider === "EPAY") {
      value.epayChannels = normalizeEpayChannels(parsed.epayChannels);
    }
    return value;
  } catch {
    return {
      ...defaults,
      name: record.name,
      isEnabled: record.isEnabled,
    };
  }
}

export async function listEnabledPaymentMethods(prisma?: PrismaClient): Promise<PaymentMethodItem[]> {
  const client = prisma ?? getPaymentContext().prisma;
  const records = await listPaymentConfigRecords(client);

  return (Object.keys(defaultPaymentConfigs) as PaymentProvider[]).map((provider) => {
    const record = records.find((item) => item.provider === provider);
    const value = normalizePaymentConfig(record ?? null, provider);
    return {
      provider,
      label: value.name,
      enabled: value.isEnabled,
      baseUrl: value.baseUrl,
      epayChannels: provider === "EPAY" ? normalizeEpayChannels(value.epayChannels) : undefined,
    };
  });
}

export async function getPaymentConfigs(prisma?: PrismaClient): Promise<Record<string, PaymentConfigValue>> {
  const client = prisma ?? getPaymentContext().prisma;
  const records = await listPaymentConfigRecords(client);
  const result: Record<string, PaymentConfigValue> = {};
  for (const provider of Object.keys(defaultPaymentConfigs) as PaymentProvider[]) {
    const record = records.find((r) => r.provider === provider) ?? null;
    result[provider] = normalizePaymentConfig(record, provider);
  }
  return result;
}

export async function savePaymentConfig(input: PaymentConfigValue) {
  const adminContext = getAdminContext();
  const { prisma } = adminContext;
  const adminId = Number(adminContext.session?.user?.id);
  validatePaymentConfigInput(input as any);
  const config = {
    baseUrl: input.baseUrl?.trim() || "",
    appId: input.appId?.trim() || "",
    appSecret: input.appSecret?.trim() || "",
    pid: input.pid?.trim() || "",
    key: input.key?.trim() || "",
    ...(input.provider === "EPAY" ? { epayChannels: normalizeEpayChannels(input.epayChannels) } : {}),
    notifyUrl: input.notifyUrl?.trim() || "",
    returnUrl: input.returnUrl?.trim() || "",
    alipayAppId: input.alipayAppId?.trim() || "",
    alipayPrivateKey: input.alipayPrivateKey?.trim() || "",
    alipayPublicKey: input.alipayPublicKey?.trim() || "",
    stripeSecretKey: input.stripeSecretKey?.trim() || "",
    stripeWebhookSecret: input.stripeWebhookSecret?.trim() || "",
    stripeCurrency: input.stripeCurrency?.trim() || "cny",
    hashpayMerchantId: input.hashpayMerchantId?.trim() || "",
    hashpayPrivateKey: input.hashpayPrivateKey?.trim() || "",
    hashpayCurrency: input.hashpayCurrency?.trim() || "CNY",
  };

  const record = await upsertPaymentConfigRecord(prisma, input.provider, {
    name: input.name.trim() || defaultPaymentConfigs[input.provider].name,
    isEnabled: input.isEnabled,
    configJson: JSON.stringify(config),
  });

  await logAdminOperation(
    {
      action: "SAVE_PAYMENT_CONFIG",
      targetType: "PaymentConfig",
      targetId: input.provider,
      detail: `enabled=${input.isEnabled}`,
    },
    {
      prisma,
      adminId,
    },
  );

  return normalizePaymentConfig(record, input.provider);
}

function createProviderAdapter(config: PaymentConfigValue) {
  if (config.provider === "BEPUSDT") {
    return createBepusdtAdapter(config);
  }
  if (config.provider === "ALIPAY") {
    return createAlipayAdapter(config);
  }
  if (config.provider === "ALIPAY_FACE") {
    return createAlipayFaceAdapter(config);
  }
  if (config.provider === "STRIPE") {
    return createStripeAdapter(config);
  }
  if (config.provider === "HASHPAY") {
    return createHashpayAdapter(config);
  }
  return createEpayAdapter(config);
}

async function getBaseOrigin(prisma: PrismaClient) {
  const site = await getSiteSetting(prisma);
  const baseOrigin = site.siteUrl?.trim().replace(/\/+$/, "") || "";

  if (!baseOrigin) {
    throw badRequestError("站点设置缺少网站地址", "SITE_URL_MISSING");
  }

  return baseOrigin;
}

function applyUrlTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

function resolveCallbackUrl(baseOrigin: string, configuredValue: string | undefined, fallbackValue: string, templateValues?: Record<string, string>) {
  const rawValue = (configuredValue?.trim() || fallbackValue).trim();
  const templatedValue = applyUrlTemplate(rawValue, templateValues ?? {});

  if (/^https?:\/\//i.test(templatedValue)) {
    return templatedValue;
  }

  const normalizedPath = templatedValue.startsWith("/") ? templatedValue : `/${templatedValue}`;
  return `${baseOrigin}${normalizedPath}`;
}

export async function createPaymentForOrder(orderNo: string, prisma?: PrismaClient) {
  const client = prisma ?? getPaymentContext().prisma;
  const order = await client.order.findUnique({
    where: { orderNo },
  });

  if (!order) {
    throw notFoundError("订单不存在", "ORDER_NOT_FOUND");
  }

  if (order.paymentStatus === "PAID") {
    throw conflictError("订单已支付", "ORDER_ALREADY_PAID");
  }

  const configs = await getPaymentConfigs(client);
  const config = configs[order.paymentProvider];

  if (!config.isEnabled) {
    throw conflictError(`${config.name} 当前未启用`, "PAYMENT_PROVIDER_DISABLED");
  }

  if (!config.baseUrl) {
    throw badRequestError(`${config.name} 缺少网关地址配置`, "PAYMENT_PROVIDER_BASE_URL_MISSING");
  }

  const paymentChannel = order.paymentProvider === "EPAY"
    ? resolveEpayChannel(config.epayChannels, order.paymentChannel)
    : order.paymentChannel ?? undefined;
  if (order.paymentProvider === "EPAY" && !paymentChannel) {
    throw conflictError("所选易支付渠道当前未启用", "EPAY_CHANNEL_DISABLED");
  }

  const adapter = createProviderAdapter(config);
  const baseOrigin = await getBaseOrigin(client);
  const templateValues = {
    orderNo: order.orderNo,
    token: encodeURIComponent(order.queryToken),
  };
  const notifyUrl = resolveCallbackUrl(
    baseOrigin,
    config.notifyUrl,
    defaultPaymentConfigs[order.paymentProvider as PaymentProvider]?.notifyUrl ?? "/api/payments/notify",
  );
  const returnUrl = resolveCallbackUrl(
    baseOrigin,
    config.returnUrl,
    `/order/{orderNo}?token={token}`,
    templateValues,
  );

  const result = await adapter.createPayment({
    orderNo: order.orderNo,
    amount: order.amount,
    productName: order.productNameSnapshot,
    notifyUrl,
    returnUrl,
    paymentChannel: paymentChannel ?? undefined,
  });

  if (result.paymentOrderNo) {
    await client.order.update({
      where: { orderNo: order.orderNo },
      data: {
        paymentOrderNo: result.paymentOrderNo,
      },
    });
  }

  await createPaymentLogRecord(client, {
    orderId: order.id,
    provider: order.paymentProvider,
    orderNo: order.orderNo,
    paymentOrderNo: result.paymentOrderNo,
    eventType: "CREATE_PAYMENT",
    rawPayload: JSON.stringify(result.raw ?? result),
    verifyStatus: "PENDING",
    message: "payment created",
  });

  return result;
}

function formatNotifyLogMessage(source: string, message?: string | null, status?: string | null) {
  const base = `source=${source}, ${message || "unknown"}`;
  return status ? `${base}; status=${status}` : base;
}

function redactSensitiveValue(value: string) {
  if (value.length <= 8) {
    return "***";
  }

  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

function sanitizePaymentPayload(payload?: Record<string, unknown>) {
  if (!payload) {
    return undefined;
  }

  const sensitivePattern = /(md5|sign|signature|key|secret|appsecret|密钥)/i;
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if (!sensitivePattern.test(key)) {
        return [key, value];
      }

      return [key, redactSensitiveValue(String(value ?? ""))];
    }),
  );
}

async function createNotifyLog(prisma: PrismaClient, input: {
  orderId?: number;
  provider: PaymentProvider;
  orderNo?: string;
  paymentOrderNo?: string;
  eventType?: string;
  rawPayload: string;
  verifyStatus: "PENDING" | "VERIFIED" | "FAILED";
  source: string;
  message?: string | null;
  status?: string | null;
}) {
  await createPaymentLogRecord(prisma, {
    orderId: input.orderId,
    provider: input.provider,
    orderNo: input.orderNo,
    paymentOrderNo: input.paymentOrderNo,
    eventType: input.eventType ?? "NOTIFY",
    rawPayload: input.rawPayload,
    verifyStatus: input.verifyStatus,
    message: formatNotifyLogMessage(input.source, input.message, input.status),
  });
}

function writePaymentNotifyDiagnostic(input: {
  provider: PaymentProvider;
  source: string;
  reason: string;
  payload?: Record<string, unknown>;
  orderNo?: string;
  error?: unknown;
}) {
  const context = {
    event: "payment.notify.diagnostic",
    provider: input.provider,
    source: input.source,
    reason: input.reason,
    orderNo: input.orderNo,
    payload: sanitizePaymentPayload(input.payload),
  };

  if (input.error instanceof Error) {
    logger.error(input.error, context);
    return;
  }

  logger.error(input.reason, {
    ...context,
    error: input.error ? String(input.error) : undefined,
  });
}

export async function queryAlipayPayment(orderNo: string, prisma?: PrismaClient) {
  const client = prisma ?? getPaymentContext().prisma;
  const order = await findOrderRecord(client, orderNo);
  if (!order) throw notFoundError("订单不存在", "ORDER_NOT_FOUND");
  if (order.paymentStatus === "PAID") return { alreadyPaid: true };

  const provider = order.paymentProvider === "ALIPAY_FACE" ? "ALIPAY_FACE" : "ALIPAY";
  const configs = await getPaymentConfigs(client);
  const config = configs[provider];
  const result = await queryAlipayTrade(config, orderNo);

  if (result.isPaid) {
    const updated = await updateOrderPayment(client, orderNo, {
      paymentOrderNo: result.tradeNo,
      status: "PAID",
      paymentStatus: "PAID",
      paidAt: new Date(),
    });
    if (updated) {
      await createPaymentLogRecord(client, {
        orderId: order.id,
        provider,
        orderNo,
        paymentOrderNo: result.tradeNo,
        eventType: "QUERY_PAID",
        rawPayload: JSON.stringify(result),
        verifyStatus: "VERIFIED",
        message: "paid via query",
      });
      try {
        await deliverOrder(client, orderNo);
      } catch (error) {
        logger.error(error instanceof Error ? error : new Error(String(error)), {
          event: "payment.alipay_query.delivery_failed",
          orderNo,
        });
      }
    }
  }

  return { alreadyPaid: false, isPaid: result.isPaid };
}

export async function handlePaymentNotify(
  provider: PaymentProvider,
  payload: Record<string, string>,
  prisma: PrismaClient,
  source: string,
) {
  const configs = await getPaymentConfigs(prisma);
  const adapter = createProviderAdapter(configs[provider]);
  const verified = await adapter.verifyNotify(payload);
  const order = verified.orderNo ? await findOrderRecord(prisma, verified.orderNo) : null;
  const rawPayload = JSON.stringify(verified.raw);

  if (!verified.isValid) {
    await createNotifyLog(prisma, {
      orderId: order?.id,
      provider,
      orderNo: verified.orderNo,
      paymentOrderNo: verified.paymentOrderNo,
      rawPayload,
      verifyStatus: "FAILED",
      source,
      message: verified.message,
      status: verified.status,
    });
    writePaymentNotifyDiagnostic({
      provider,
      source,
      reason: verified.message || "invalid notify",
      orderNo: verified.orderNo,
      payload,
    });
    return {
      ok: false,
      status: verified.status,
      message: verified.message || "invalid notify",
    };
  }

  if (!verified.orderNo) {
    await createNotifyLog(prisma, {
      provider,
      paymentOrderNo: verified.paymentOrderNo,
      rawPayload,
      verifyStatus: "FAILED",
      source,
      message: "missing orderNo",
      status: verified.status,
    });
    writePaymentNotifyDiagnostic({
      provider,
      source,
      reason: "missing orderNo",
      payload,
    });
    return {
      ok: false,
      status: verified.status,
      message: verified.message || "missing orderNo",
    };
  }

  if (!order) {
    await createNotifyLog(prisma, {
      provider,
      orderNo: verified.orderNo,
      paymentOrderNo: verified.paymentOrderNo,
      rawPayload,
      verifyStatus: "FAILED",
      source,
      message: "missing order",
      status: verified.status,
    });
    writePaymentNotifyDiagnostic({
      provider,
      source,
      reason: "missing order",
      orderNo: verified.orderNo,
      payload,
    });
    return {
      ok: false,
      status: verified.status,
      message: "missing order",
    };
  }

  if (order.paymentProvider !== provider) {
    await createNotifyLog(prisma, {
      orderId: order.id,
      provider,
      orderNo: verified.orderNo,
      paymentOrderNo: verified.paymentOrderNo,
      eventType: "NOTIFY_PROVIDER_MISMATCH",
      rawPayload,
      verifyStatus: "FAILED",
      source,
      message: `expected=${order.paymentProvider}, actual=${provider}`,
      status: verified.status,
    });

    writePaymentNotifyDiagnostic({
      provider,
      source,
      reason: "payment provider mismatch",
      orderNo: verified.orderNo,
      payload,
    });

    return {
      ok: false,
      status: verified.status,
      message: "payment provider mismatch",
    };
  }

  if (verified.amount !== undefined && verified.amount !== order.amount) {
    await createNotifyLog(prisma, {
      orderId: order.id,
      provider,
      orderNo: verified.orderNo,
      paymentOrderNo: verified.paymentOrderNo,
      eventType: "NOTIFY_AMOUNT_MISMATCH",
      rawPayload,
      verifyStatus: "FAILED",
      source,
      message: `expected=${order.amount}, actual=${verified.amount}`,
      status: verified.status,
    });

    writePaymentNotifyDiagnostic({
      provider,
      source,
      reason: "amount mismatch",
      orderNo: verified.orderNo,
      payload,
    });

    return {
      ok: false,
      status: "FAILED",
      message: "amount mismatch",
    };
  }

  if (order.paymentStatus === "PAID") {
    let message = "already paid";

    if (order.deliveryStatus === "NOT_DELIVERED") {
      const product = await prisma.product.findUnique({
        where: { id: order.productId },
        select: { deliveryType: true },
      });

      if (product?.deliveryType !== "MANUAL" && product?.deliveryType !== "EXPRESS") {
        try {
          await deliverOrder(prisma, order.orderNo);
          message = "already paid; delivery retried";
        } catch (error) {
          writePaymentNotifyDiagnostic({
            provider,
            source,
            reason: "delivery retry failed for already paid order",
            orderNo: verified.orderNo,
            payload,
            error,
          });
          message = "already paid; delivery retry failed";
        }
      }
    }

    await createNotifyLog(prisma, {
      orderId: order.id,
      provider,
      orderNo: verified.orderNo,
      paymentOrderNo: verified.paymentOrderNo,
      rawPayload,
      verifyStatus: "VERIFIED",
      source,
      message,
      status: verified.status,
    });

    return {
      ok: true,
      status: verified.status,
      message,
    };
  }

  if (verified.status === "PAID") {
    const updated = await updateOrderPayment(prisma, verified.orderNo, {
      paymentOrderNo: verified.paymentOrderNo,
      status: "PAID",
      paymentStatus: "PAID",
      paidAt: new Date(),
    });

    if (!updated) {
      // 已经被并发回调处理过了
      return {
        ok: true,
        status: "PAID",
        message: "already paid",
      };
    }

    // 先记录首次成功回调，再执行发货，避免并发下后到的回调先写出
    // `already paid`，而首个成功回调的 `ok` 反而更晚落库。
    // 如果订单之前被 auto-close 关闭过（status=CLOSED），在日志中标注重开。
    const reopenNote = order.status === "CLOSED" ? " (reopened from CLOSED)" : "";
    await createNotifyLog(prisma, {
      orderId: order.id,
      provider,
      orderNo: verified.orderNo,
      paymentOrderNo: verified.paymentOrderNo,
      rawPayload,
      verifyStatus: "VERIFIED",
      source,
      message: `ok${reopenNote}`,
      status: verified.status,
    });

    if (order.contactType === "EMAIL" && order.contactValue) {
      try {
        await notifyOrderPaid({
          prisma,
          orderId: order.id,
          orderNo: order.orderNo,
          queryToken: order.queryToken,
          productName: order.productNameSnapshot,
          amount: order.amount,
          toEmail: order.contactValue,
          contactEmail: order.contactValue,
          buyerNote: order.buyerNote,
        });
      } catch (error) {
        logger.error(error instanceof Error ? error : String(error), {
          event: "email.order_paid.failed",
          provider,
          orderNo: order.orderNo,
        });
      }
    }

    try {
      await deliverOrder(prisma, verified.orderNo);
    } catch (error) {
      writePaymentNotifyDiagnostic({
        provider,
        source,
        reason: "delivery failed",
        orderNo: verified.orderNo,
        payload,
        error,
      });
      await createNotifyLog(prisma, {
        orderId: order.id,
        provider,
        orderNo: verified.orderNo,
        paymentOrderNo: verified.paymentOrderNo,
        rawPayload,
        verifyStatus: "VERIFIED",
        source,
        message: "delivery failed",
        status: verified.status,
      });
      return {
        ok: false,
        status: "FAILED" as const,
        message: error instanceof Error ? error.message : "delivery failed",
      };
    }

    return {
      ok: true,
      status: verified.status,
      message: "ok",
    };
  }

  if (verified.status === "FAILED") {
    await updateOrderPayment(prisma, verified.orderNo, {
      paymentOrderNo: verified.paymentOrderNo,
      status: "FAILED",
      paymentStatus: "FAILED",
      paidAt: null,
    });
  }

  await createNotifyLog(prisma, {
    orderId: order.id,
    provider,
    orderNo: verified.orderNo,
    paymentOrderNo: verified.paymentOrderNo,
    rawPayload,
    verifyStatus: "VERIFIED",
    source,
    message: "ok",
    status: verified.status,
  });

  return {
    ok: true,
    status: verified.status,
    message: "ok",
  };
}
