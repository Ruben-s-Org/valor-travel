<script setup lang="ts">
import { cn } from '@/lib/utils'
import { AccordionHeader, AccordionTrigger } from 'radix-vue'

const props = defineProps<{ class?: string }>()
</script>

<template>
  <AccordionHeader class="flex">
    <AccordionTrigger
      :class="cn('flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180 cursor-pointer', props.class)"
    >
      <slot />
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 transition-transform duration-200"><path d="m6 9 6 6 6-6"/></svg>
    </AccordionTrigger>
  </AccordionHeader>
</template>
