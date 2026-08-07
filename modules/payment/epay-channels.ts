export const EPAY_CHANNEL_OPTIONS = [
  { value: "alipay", label: "支付宝" },
  { value: "wxpay", label: "微信支付" },
] as const;

export type EpayChannel = (typeof EPAY_CHANNEL_OPTIONS)[number]["value"];

export const DEFAULT_EPAY_CHANNELS: EpayChannel[] = EPAY_CHANNEL_OPTIONS.map((channel) => channel.value);

export function isEpayChannel(value: unknown): value is EpayChannel {
  return EPAY_CHANNEL_OPTIONS.some((channel) => channel.value === value);
}

export function normalizeEpayChannels(value: unknown): EpayChannel[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_EPAY_CHANNELS];
  }

  return EPAY_CHANNEL_OPTIONS
    .map((channel) => channel.value)
    .filter((channel) => value.includes(channel));
}

export function resolveEpayChannel(enabledChannels: unknown, requestedChannel: unknown): EpayChannel | null {
  const channels = normalizeEpayChannels(enabledChannels);
  const requested = isEpayChannel(requestedChannel) ? requestedChannel : channels[0];
  return requested && channels.includes(requested) ? requested : null;
}
