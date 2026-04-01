<script setup lang="ts">
import { cn } from '@/lib/utils'
import { AccordionContent } from 'radix-vue'

const props = defineProps<{ class?: string }>()
</script>

<template>
  <AccordionContent :class="cn('overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down', props.class)">
    <div class="pb-4 pt-0">
      <slot />
    </div>
  </AccordionContent>
</template>
