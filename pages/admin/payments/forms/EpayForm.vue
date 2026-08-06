<template>
  <div class="grid gap-4 md:grid-cols-2">
    <label class="flex flex-col gap-1.5">
      <span class="label-text font-medium">PID</span>
      <input v-model="modelValue.pid" class="input input-bordered w-full" />
    </label>
    <label class="flex flex-col gap-1.5">
      <span class="label-text font-medium">Key</span>
      <SecretInput v-model="modelValue.key" />
    </label>
  </div>
  <fieldset class="space-y-2">
    <legend class="label-text font-medium">前台支付渠道</legend>
    <div class="flex flex-wrap gap-4">
      <label v-for="channel in EPAY_CHANNEL_OPTIONS" :key="channel.value" class="label cursor-pointer gap-2">
        <input v-model="modelValue.epayChannels" type="checkbox" class="checkbox checkbox-primary checkbox-sm" :value="channel.value" />
        <span class="label-text">{{ channel.label }}</span>
      </label>
    </div>
    <p class="text-xs text-base-content/60">仅勾选网关实际支持的渠道；启用易支付时至少选择一项。</p>
  </fieldset>
  <p class="text-xs text-base-content/60">
    `Notify URL` 和 `Return URL` 支持填写相对路径或完整 URL；`Return URL` 支持 `{orderNo}`、`{token}` 占位符。
  </p>
</template>

<script setup lang="ts">
import SecretInput from "../../../../components/SecretInput.vue";
import { EPAY_CHANNEL_OPTIONS } from "../../../../modules/payment/epay-channels";
defineProps<{ modelValue: Record<string, any> }>();
</script>
