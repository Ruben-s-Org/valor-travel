<script setup lang="ts">
import { cn } from '@/lib/utils'
import { AccordionItem, type AccordionItemProps } from 'radix-vue'

const props = defineProps<AccordionItemProps & { class?: string }>()
</script>

<template>
  <AccordionItem :value="props.value" :class="cn('border-b border-border', props.class)">
    <slot />
  </AccordionItem>
</template>
