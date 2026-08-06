import { badRequestError } from "../app-error";
import { isEpayChannel, normalizeEpayChannels } from "../../modules/payment/epay-channels";

export function validatePaymentConfigInput(input: {
  name?: string;
  baseUrl?: string;
  provider: string;
  isEnabled?: boolean;
  appSecret?: string;
  pid?: string;
  key?: string;
  epayChannels?: string[];
  alipayAppId?: string;
  alipayPrivateKey?: string;
  alipayPublicKey?: string;
}) {
  const name = input.name?.trim() || "";
  if (!name) {
    throw badRequestError("支付方式名称不能为空", "PAYMENT_NAME_REQUIRED");
  }

  const baseUrl = input.baseUrl?.trim() || "";
  if (input.isEnabled !== false && !baseUrl) {
    throw badRequestError("启用支付方式时必须填写网关地址", "PAYMENT_BASE_URL_REQUIRED");
  }

  if (input.provider === "BEPUSDT" && input.isEnabled !== false && !(input.appSecret?.trim())) {
    throw badRequestError("启用 BEpusdt 时必须填写 App Secret", "BEPUSDT_APP_SECRET_REQUIRED");
  }

  if (input.provider === "EPAY") {
    if (input.epayChannels !== undefined && (!Array.isArray(input.epayChannels) || input.epayChannels.some((channel) => !isEpayChannel(channel)))) {
      throw badRequestError("易支付渠道配置无效", "EPAY_CHANNEL_INVALID");
    }

    if (input.isEnabled !== false) {
      if (!(input.pid?.trim())) {
        throw badRequestError("启用 Epay 时必须填写 PID", "EPAY_PID_REQUIRED");
      }
      if (!(input.key?.trim())) {
        throw badRequestError("启用 Epay 时必须填写 Key", "EPAY_KEY_REQUIRED");
      }
      if (normalizeEpayChannels(input.epayChannels).length === 0) {
        throw badRequestError("启用 Epay 时至少选择一个支付渠道", "EPAY_CHANNEL_REQUIRED");
      }
    }
  }

  if ((input.provider === "ALIPAY" || input.provider === "ALIPAY_FACE") && input.isEnabled !== false) {
    if (!(input.alipayAppId?.trim())) {
      throw badRequestError("启用支付宝时必须填写 App ID", "ALIPAY_APP_ID_REQUIRED");
    }
    if (!(input.alipayPrivateKey?.trim())) {
      throw badRequestError("启用支付宝时必须填写应用私钥", "ALIPAY_PRIVATE_KEY_REQUIRED");
    }
    if (!(input.alipayPublicKey?.trim())) {
      throw badRequestError("启用支付宝时必须填写支付宝公钥", "ALIPAY_PUBLIC_KEY_REQUIRED");
    }
  }

  return {
    name,
    baseUrl,
  };
}
