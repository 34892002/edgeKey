<template>
  <section class="card bg-base-100 shadow-sm">
    <div class="card-body space-y-4">
      <div class="flex items-center justify-between gap-4 max-md:flex-col max-md:items-start">
        <div>
          <h1 class="text-2xl font-bold">{{ title }}</h1>
          <p class="text-sm text-base-content/70">配置支付网关参数并控制该支付方式是否在前台展示。</p>
        </div>
        <label class="label cursor-pointer gap-3">
          <span class="label-text font-medium">启用</span>
          <input v-model="form.isEnabled" type="checkbox" class="toggle toggle-primary" />
        </label>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <label class="flex flex-col gap-1.5">
          <span class="label-text font-medium">显示名称</span>
          <input v-model="form.name" class="input input-bordered w-full" />
        </label>
                <label class="flex flex-col gap-1.5">
                  <span class="label-text font-medium">网关地址(仅需填写主域名，系统处理接口)</span>
                  <input v-model="form.baseUrl" class="input input-bordered w-full" placeholder="https://pay.example.com (末尾请勿加斜杠)" :disabled="provider === 'STRIPE'" :readonly="provider === 'STRIPE'" />
                </label>
      </div>

      <component :is="formMap[provider]" v-model="extraFields" />

      <div class="grid gap-4 md:grid-cols-2">
        <label class="flex flex-col gap-1.5">
          <span class="label-text font-medium">Notify URL</span>
          <input v-model="form.notifyUrl" class="input input-bordered w-full" placeholder="/api/payments/epay/notify" />
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="label-text font-medium">Return URL</span>
          <input v-model="form.returnUrl" class="input input-bordered w-full" placeholder="/order/{orderNo}?token={token}" />
        </label>
      </div>

      <div class="flex items-center gap-3">
        <AppButton variant="primary" :loading="saving" @click="handleSave">保存配置</AppButton>
        <span v-if="saved" class="badge badge-success">已保存</span>
        <span v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import AppButton from "../../../components/AppButton.vue";
import { normalizeTelefuncError } from "../../../lib/app-error";
import { onSavePaymentConfig } from "./savePaymentConfig.telefunc";
import BEpusdtForm from "./forms/BEpusdtForm.vue";
import EpayForm from "./forms/EpayForm.vue";
import AlipayForm from "./forms/AlipayForm.vue";
import AlipayFaceForm from "./forms/AlipayFaceForm.vue";
import StripeForm from "./forms/StripeForm.vue";
import HashpayForm from "./forms/HashpayForm.vue";
import type { PaymentProvider, PaymentConfigValue } from "../../../modules/payment/types";
import { DEFAULT_EPAY_CHANNELS } from "../../../modules/payment/epay-channels";

const formMap: Record<string, any> = { BEPUSDT: BEpusdtForm, EPAY: EpayForm, ALIPAY: AlipayForm, ALIPAY_FACE: AlipayFaceForm, STRIPE: StripeForm, HASHPAY: HashpayForm };

const emit = defineEmits<{ saved: [value: typeof props.initialValue] }>();

const props = defineProps<{
  provider: PaymentProvider;
  title: string;
  initialValue: PaymentConfigValue | null;
}>();

const form = reactive({
  name: props.initialValue?.name ?? (props.provider === 'BEPUSDT' ? 'BEpusdt' : '聚合支付'),
  isEnabled: props.initialValue?.isEnabled ?? false,
  baseUrl: props.initialValue?.baseUrl ?? '',
  notifyUrl: props.initialValue?.notifyUrl ?? '',
  returnUrl: props.initialValue?.returnUrl ?? '',
});

const extraFieldsMap: Record<string, () => Record<string, any>> = {
  BEPUSDT: () => ({ appId: props.initialValue?.appId ?? '', appSecret: props.initialValue?.appSecret ?? '' }),
  EPAY: () => ({ pid: props.initialValue?.pid ?? '', key: props.initialValue?.key ?? '', epayChannels: props.initialValue?.epayChannels ?? [...DEFAULT_EPAY_CHANNELS] }),
  ALIPAY: () => ({ alipayAppId: props.initialValue?.alipayAppId ?? '', alipayPrivateKey: props.initialValue?.alipayPrivateKey ?? '', alipayPublicKey: props.initialValue?.alipayPublicKey ?? '' }),
  ALIPAY_FACE: () => ({ alipayAppId: props.initialValue?.alipayAppId ?? '', alipayPrivateKey: props.initialValue?.alipayPrivateKey ?? '', alipayPublicKey: props.initialValue?.alipayPublicKey ?? '' }),
  STRIPE: () => ({ stripeSecretKey: props.initialValue?.stripeSecretKey ?? '', stripeWebhookSecret: props.initialValue?.stripeWebhookSecret ?? '', stripeCurrency: props.initialValue?.stripeCurrency ?? 'cny' }),
  HASHPAY: () => ({ hashpayMerchantId: props.initialValue?.hashpayMerchantId ?? '', hashpayPrivateKey: props.initialValue?.hashpayPrivateKey ?? '', hashpayCurrency: props.initialValue?.hashpayCurrency ?? 'CNY' }),
};
const extraFields = reactive((extraFieldsMap[props.provider] ?? extraFieldsMap.EPAY)());

const saving = ref(false);
const saved = ref(false);
const errorMessage = ref('');

async function handleSave() {
  saving.value = true;
  saved.value = false;
  errorMessage.value = '';
  try {
    const result = await onSavePaymentConfig({ provider: props.provider, ...form, ...extraFields });
    form.name = result.name;
    form.isEnabled = result.isEnabled;
    form.baseUrl = result.baseUrl;
    form.notifyUrl = result.notifyUrl ?? '';
    form.returnUrl = result.returnUrl ?? '';
    for (const key of Object.keys(extraFields)) {
      (extraFields as any)[key] = (result as any)[key] ?? (extraFields as any)[key];
    }
    saved.value = true;
    emit('saved', { provider: props.provider, ...form, ...extraFields });
  } catch (error) {
    errorMessage.value = normalizeTelefuncError(error, '保存失败');
  } finally {
    saving.value = false;
  }
}
</script>
