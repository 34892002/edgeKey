<template>
  <div v-if="!product" class="alert alert-warning">商品不存在或未上架。</div>
  <div v-else class="grid gap-6 lg:grid-cols-[2fr_1fr]">
    <section class="card bg-base-100 shadow-sm overflow-hidden">
      <figure class="w-full bg-base-200 !m-0">
        <img :src="product.coverImage || emptyCoverUrl" :alt="product.name" class="w-full object-cover max-h-96" />
      </figure>
      <div class="card-body space-y-4">
        <div>
          <p class="text-sm uppercase tracking-[0.2em] text-primary">Product</p>
          <h1 class="text-3xl font-bold">{{ product.name }}</h1>
          <p class="mt-2 text-base-content/70">{{ product.subtitle }}</p>
        </div>
        <div
          ref="descriptionRef"
          class="max-w-none overflow-hidden text-base-content/80 [&_img]:my-4! [&_img]:block! [&_img]:h-auto! [&_img]:max-w-full! [&_img]:cursor-zoom-in [&_img]:rounded-xl! [&_img]:transition-opacity [&_img]:hover:opacity-90"
          @click="handleDescriptionClick"
          v-html="descriptionHtml"
        ></div>
        <div class="rounded-box bg-base-200 p-4 text-sm text-base-content/80">
          {{ product.purchaseNote || '下单后将生成待支付订单，支付成功后会给您的联系邮箱发送通知，请注意查看。' }}
        </div>
      </div>
    </section>

    <aside>
      <div class="lg:sticky lg:top-24 card bg-base-100 shadow-sm">
        <div class="card-body space-y-4">
          <div>
            <div class="text-sm text-base-content/60">当前价格</div>
            <div class="text-3xl font-bold text-primary">{{ formatCents(product.price) }}</div>
          </div>
          <div class="flex">
              <!-- <div class="text-sm text-base-content/70">限购 {{ product.minBuy }} - {{ product.maxBuy }} 件</div> -->
              <div class="text-sm text-base-content/70">限购 {{ product.maxBuy }} 件，</div>
              <div class="text-sm text-base-content/70">发货方式：{{ getDeliveryTypeLabel(product.deliveryType) }}</div>
          </div>
          <div class="divider my-0"></div>

          <label class="flex flex-col gap-1.5">
            <span class="label-text font-medium">联系邮箱 <span class="text-error">*</span></span>
            <input v-model="form.contactValue" type="email" class="input input-bordered w-full" placeholder="name@example.com" />
          </label>
          <p class="-mt-2 text-xs text-base-content/60">必填，自动发货和售后联系都会发送到这个邮箱。</p>

          <label class="flex flex-col gap-1.5">
            <span class="label-text font-medium">购买数量</span>
            <input v-model.number="form.quantity" type="number" :min="product.minBuy" :max="product.maxBuy" class="input input-bordered w-full" />
          </label>

          <label class="flex flex-col gap-1.5">
            <span class="label-text font-medium">折扣码</span>
            <div class="flex gap-2">
              <input 
                v-model="form.discountCode" 
                type="text" 
                class="input input-bordered flex-1" 
                placeholder="输入折扣码（可选）"
                :disabled="discountPreview.loading"
              />
              <button 
                class="btn btn-outline"
                :disabled="!form.discountCode.trim() || discountPreview.loading"
                @click="handlePreviewDiscount"
              >
                {{ discountPreview.loading ? '验证中...' : '验证' }}
              </button>
            </div>
          </label>
          <p v-if="discountPreview.error" class="-mt-2 text-xs text-error">{{ discountPreview.error }}</p>
          <p v-if="discountPreview.valid" class="-mt-2 text-xs text-orange-400">折扣码有效，优惠 {{ formatCents(discountPreview.discount) }}</p>

          <label v-if="product.deliveryType === 'EXPRESS'" class="flex flex-col gap-1.5">
            <span class="label-text font-medium">收货信息 <span class="text-error">*</span></span>
            <textarea v-model="form.receiverInfo" class="textarea textarea-bordered w-full" rows="3" placeholder="请填写收货信息，例如：
张三，13812341234，广东省深圳市xxx"></textarea>
          </label>

          <label class="flex flex-col gap-1.5">
            <span class="label-text font-medium">备注</span>
            <textarea v-model="form.buyerNote" class="textarea textarea-bordered w-full" rows="3" placeholder="可以留下QQ号、微信等联系方式"></textarea>
          </label>

          <div v-if="!isFreeOrder" class="space-y-2">
            <div class="text-sm font-medium">支付方式</div>
            <div class="grid gap-3">
              <label v-for="method in paymentMethods" :key="method.provider" class="rounded-box border border-base-300 p-4">
                <div class="flex items-center justify-between gap-3">
                  <span>{{ method.label }}</span>
                  <input v-model="form.paymentProvider" type="radio" class="radio radio-primary radio-sm" :value="method.provider" />
                </div>
              </label>
            </div>
          </div>

          <div v-if="!isFreeOrder && form.paymentProvider === 'EPAY'" class="space-y-2">
            <div class="text-sm font-medium">易支付渠道</div>
            <div class="grid gap-3 md:grid-cols-2">
              <label v-for="channel in epayChannels" :key="channel.value" class="rounded-box border border-base-300 p-4">
                <div class="flex items-center justify-between gap-3">
                  <span class="flex items-center gap-2">
                    <svg v-if="channel.icon === 'alipay'" class="h-5 w-5 text-[#1677ff]" viewBox="0 0 1024 1024" fill="currentColor" aria-hidden="true">
                      <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64Zm234.5 610.9c-26.2-8.6-61.5-21.8-101.9-39.9-45.6 52.5-103.4 83.2-173.5 83.2-76.6 0-126.2-40.5-126.2-98.8 0-56.6 47.8-99.4 124.5-99.4 38.1 0 79.7 8.3 124.8 24.9 18.4-32.3 33.1-69.8 44.1-112.5H318.7v-58.8h169.1v-61.9H282.2v-60.2h205.6v-82.1h67.3v82.1h207.1v60.2H555.1v61.9h171.6c-14.8 76.6-39.3 140.7-73.5 192.3 38.5 16.4 77.9 31.1 118.2 44.2l-24.9 64.8ZM468.8 579.2c-39.4 0-62.5 15.2-62.5 39.7 0 25.9 24.3 43.5 63.7 43.5 43.1 0 79.7-18.1 109.8-54.4-42.1-19.2-79.1-28.8-111-28.8Z" />
                    </svg>
                    <svg v-else-if="channel.icon === 'wechat'" class="h-5 w-5" viewBox="0 0 1024 1024" aria-hidden="true">
                      <path fill="#07c160" d="M420 190c-190 0-344 123-344 276 0 88 51 166 131 217l-31 94 112-55c41 13 86 20 132 20 190 0 344-123 344-276S610 190 420 190Z" />
                      <path fill="#07c160" d="M690 431c151 0 274 97 274 216 0 70-42 132-108 171l25 77-90-45c-32 9-66 14-101 14-151 0-274-97-274-217s123-216 274-216Z" />
                      <circle cx="300" cy="380" r="34" fill="#fff" />
                      <circle cx="520" cy="380" r="34" fill="#fff" />
                      <circle cx="606" cy="590" r="28" fill="#fff" />
                      <circle cx="778" cy="590" r="28" fill="#fff" />
                    </svg>
                    {{ channel.label }}
                  </span>
                  <input v-model="form.paymentChannel" type="radio" class="radio radio-primary radio-sm" :value="channel.value" />
                </div>
              </label>
            </div>
          </div>

          <div v-if="discountPreview.valid" class="rounded-box bg-base-200 p-4 space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-base-content/70">商品总价</span>
              <span>{{ formatCents(product.price * form.quantity) }}</span>
            </div>
            <div class="flex justify-between text-sm text-orange-400">
              <span>折扣优惠</span>
              <span>-{{ formatCents(discountPreview.discount) }}</span>
            </div>
            <div class="divider my-0"></div>
            <div class="flex justify-between font-bold">
              <span>实付金额</span>
              <span class="text-primary">{{ formatCents(discountPreview.finalAmount) }}</span>
            </div>
          </div>

          <p v-if="product.deliveryType === 'CARD_AUTO' && product.availableStock >= 0 && product.availableStock < 10" class="text-sm" :class="product.availableStock === 0 ? 'text-error' : 'text-warning'">
            {{ product.availableStock === 0 ? '商品都卖光了，看看其他商品' : `库存紧张，仅剩 ${product.availableStock} 件` }}
          </p>
          <p v-else-if="product.deliveryType === 'FIXED_CARD'" class="text-sm text-success">自动发货，库存充足。</p>
          <p v-else-if="product.deliveryType === 'MANUAL'" class="text-sm" :class="product.availableStock === 0 ? 'text-error' : product.availableStock > 0 && product.availableStock < 10 ? 'text-warning' : 'text-success'">
            {{ product.availableStock === 0 ? '商品都卖光了，看看其他商品' : product.availableStock > 0 && product.availableStock < 10 ? `库存紧张，仅剩 ${product.availableStock} 件` : (product.manualDeliveryHint || '支付后，客服将尽快为您处理订单，请耐心等待。') }}
          </p>
          <p v-else-if="product.deliveryType === 'EXPRESS'" class="text-sm" :class="product.availableStock === 0 ? 'text-error' : product.availableStock > 0 && product.availableStock < 10 ? 'text-warning' : 'text-success'">
            {{ product.availableStock === 0 ? '商品都卖光了，看看其他商品' : product.availableStock > 0 && product.availableStock < 10 ? `库存紧张，仅剩 ${product.availableStock} 件` : (product.manualDeliveryHint || '请填写收货信息，支付后管理员将安排快递发货。') }}
          </p>

          <AppButton variant="primary" :loading="submitting" :disabled="(!isFreeOrder && !paymentMethods.length) || ((product.deliveryType === 'CARD_AUTO' || product.deliveryType === 'MANUAL' || product.deliveryType === 'EXPRESS') && product.availableStock === 0)" @click="handleCreateOrder">
            {{ (product.deliveryType === 'CARD_AUTO' || product.deliveryType === 'MANUAL' || product.deliveryType === 'EXPRESS') && product.availableStock === 0 ? '已售罄' : isFreeOrder ? '免费获取' : '提交订单' }}
          </AppButton>
          <p v-if="!isFreeOrder && !paymentMethods.length" class="text-sm text-warning">当前没有可用支付方式，请联系管理员启用支付配置。</p>
          <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>
        </div>
      </div>
    </aside>
  </div>

  <div
    v-if="previewImage"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    role="dialog"
    aria-modal="true"
    aria-label="图片预览"
    @click.self="closeImagePreview"
  >
    <button
      type="button"
      class="btn btn-circle btn-ghost absolute right-4 top-4 text-white hover:bg-white/15"
      aria-label="关闭图片预览"
      @click="closeImagePreview"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" />
      </svg>
    </button>
    <img :src="previewImage.src" :alt="previewImage.alt" class="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
  </div>
</template>

<script setup lang="ts">
import AppButton from "../../../components/AppButton.vue";
import { normalizeTelefuncError } from "../../../lib/app-error";
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useData } from "vike-vue/useData";
import { isEmail } from "../../../lib/validators/email";
import { formatCents } from "../../../lib/utils/money";
import { onCreateOrder } from "./createOrder.telefunc";
import { onPreviewDiscount } from "./previewDiscount.telefunc";
import type { PaymentProvider } from "../../../modules/payment/types";
import { isMobile } from "../../../lib/utils/device";
import { EPAY_CHANNEL_OPTIONS, normalizeEpayChannels } from "../../../modules/payment/epay-channels";

import { saveLocalOrder } from "../../../lib/local-orders";
import type { Data } from "./+data";

import emptyCoverUrl from "../../../assets/empty.jpg";

const { product, paymentMethods } = useData<Data>();
const submitting = ref(false);
const errorMessage = ref("");
const descriptionRef = ref<HTMLElement | null>(null);
const previewImage = ref<{ src: string; alt: string } | null>(null);
const epayChannels = computed(() => {
  const method = paymentMethods.find((item) => item.provider === "EPAY");
  const enabledChannels = normalizeEpayChannels(method?.epayChannels);
  return EPAY_CHANNEL_OPTIONS
    .filter((channel) => enabledChannels.includes(channel.value))
    .map((channel) => ({ ...channel, icon: channel.value === "alipay" ? "alipay" : "wechat" }));
});

const discountPreview = reactive({
  loading: false,
  valid: false,
  error: "",
  discount: 0,
  finalAmount: 0,
});

const form = reactive({
  quantity: product?.minBuy ?? 1,
  contactValue: "",
  buyerNote: "",
  receiverInfo: "",
  discountCode: "",
  paymentProvider: paymentMethods[0]?.provider ?? "",
  paymentChannel: getDefaultPaymentChannel(paymentMethods[0]?.provider ?? ""),
});

function getDeliveryTypeLabel(type: string) {
  return ({ CARD_AUTO: "自动发货", FIXED_CARD: "自动发货", MANUAL: "人工发货", EXPRESS: "快递发货" } as Record<string, string>)[type] || type;
}

let mobile = false;

function getDefaultPaymentChannel(provider: PaymentProvider | "") {
  if (provider === "EPAY") return epayChannels.value[0]?.value ?? "";
  if (provider === "ALIPAY") return mobile ? "alipay_h5" : "alipay_pc";
  if (provider === "ALIPAY_FACE") return "";
  return "";
}

onMounted(() => {
  mobile = isMobile();
  form.paymentChannel = getDefaultPaymentChannel(form.paymentProvider);
  window.addEventListener("keydown", handlePreviewKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handlePreviewKeydown);
});

watch(() => form.paymentProvider, (provider) => {
  form.paymentChannel = getDefaultPaymentChannel(provider);
});

watch(() => form.discountCode, () => {
  discountPreview.valid = false;
  discountPreview.error = "";
  discountPreview.discount = 0;
  discountPreview.finalAmount = 0;
});

const descriptionHtml = formatDescriptionHtml(product?.description || "");

function handleDescriptionClick(event: MouseEvent) {
  const image = event.target instanceof HTMLImageElement ? event.target : null;
  if (!image || !descriptionRef.value?.contains(image)) return;

  previewImage.value = { src: image.currentSrc || image.src, alt: image.alt || product?.name || "商品描述图片" };
}

function closeImagePreview() {
  previewImage.value = null;
}

function handlePreviewKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") closeImagePreview();
}

const isFreeOrder = computed(() => {
  return discountPreview.valid && discountPreview.finalAmount === 0;
});

async function handlePreviewDiscount() {
  if (!product || !form.discountCode.trim()) return;

  discountPreview.loading = true;
  discountPreview.error = "";
  discountPreview.valid = false;

  try {
    const result = await onPreviewDiscount(form.discountCode, product.id, product.price * form.quantity);
    if (result.valid) {
      discountPreview.valid = true;
      discountPreview.discount = result.discount;
      discountPreview.finalAmount = result.finalAmount;
    } else {
      discountPreview.error = result.error;
    }
  } catch (error) {
    discountPreview.error = "验证失败，请重试";
  } finally {
    discountPreview.loading = false;
  }
}

async function handleCreateOrder() {
  if (!product || submitting.value) return;

  // 免费订单不需要支付方式
  if (!isFreeOrder.value && !form.paymentProvider) {
    errorMessage.value = "当前没有可用支付方式，请联系管理员启用支付配置。";
    return;
  }

  const contactEmail = form.contactValue.trim();
  if (!contactEmail) {
    errorMessage.value = "联系邮箱不能为空";
    return;
  }

  if (!isEmail(contactEmail)) {
    errorMessage.value = "联系邮箱格式不正确";
    return;
  }

  if (product.deliveryType === 'EXPRESS' && !form.receiverInfo.trim()) {
    errorMessage.value = "收货信息不能为空";
    return;
  }

  submitting.value = true;
  errorMessage.value = "";

  try {
    // 免费订单使用 FREE_PAY 作为占位符（服务端会跳过支付）
    const paymentProvider = isFreeOrder.value ? "FREE_PAY" : form.paymentProvider;
    
    const result = await onCreateOrder({
      productId: product.id,
      quantity: form.quantity,
      paymentProvider,
      paymentChannel: paymentProvider === "EPAY" || paymentProvider === "ALIPAY" ? form.paymentChannel : undefined,
      contactType: "EMAIL",
      contactValue: contactEmail,
      buyerNote: form.buyerNote,
      receiverInfo: form.receiverInfo,
      discountCode: form.discountCode.trim() || undefined,
    });

    saveLocalOrder({
      orderNo: result.orderNo,
      queryToken: result.queryToken,
      productName: product.name,
      amount: result.amount,
      createdAt: new Date().toISOString(),
      paymentStatus: result.paymentStatus ?? 'UNPAID',
    });

    if (result.payUrl && form.paymentProvider !== 'ALIPAY_FACE') {
      window.location.href = result.payUrl;
      return;
    }

    window.location.href = `/order/${result.orderNo}?token=${encodeURIComponent(result.queryToken)}`;
  } catch (error) {
    errorMessage.value = normalizeTelefuncError(error, "下单失败");
  } finally {
    submitting.value = false;
  }
}

function formatDescriptionHtml(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "<p>暂无商品描述。</p>";
  }

  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed;
  }

  return `<p>${escapeHtml(trimmed).replace(/\r?\n/g, "<br>")}</p>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
</script>

