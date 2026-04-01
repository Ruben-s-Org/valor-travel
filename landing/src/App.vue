<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'

const MCP_URL = 'https://valor-travel-mcp.ruben-s-org.workers.dev/mcp'
const copied = ref<string | null>(null)

function copyToClipboard(text: string, id: string) {
  navigator.clipboard.writeText(text)
  copied.value = id
  setTimeout(() => { copied.value = null }, 2000)
}

const features = [
  { title: 'Zero Authentication', desc: 'No API keys, no OAuth, no signup. Mount the URL and start searching flights instantly.', icon: '🔓' },
  { title: 'Real-Time Prices', desc: 'Live flight search with current prices from hundreds of airlines worldwide.', icon: '⚡' },
  { title: 'Price Calendar', desc: 'Monthly price trends so agents can find the cheapest day to fly for users.', icon: '📅' },
  { title: 'Booking Links', desc: 'Every result includes a direct booking URL. Users click once to complete their purchase.', icon: '🔗' },
  { title: 'Cheapest Dates', desc: 'Flexible date search finds the absolute lowest fares across weeks or months.', icon: '💰' },
  { title: 'Agent-Optimized', desc: 'Rich structured JSON, helpful error messages, and clear tool descriptions for any LLM.', icon: '🤖' },
]

const steps = [
  { step: '1', title: 'Add the MCP URL', desc: 'Copy the endpoint and add it to your Claude, ChatGPT, or agent config.' },
  { step: '2', title: 'Ask about flights', desc: '"Find me cheap flights from NYC to Tokyo in June" — the agent calls search_flights automatically.' },
  { step: '3', title: 'Book directly', desc: 'Results include booking links. Click to go straight to checkout with the best price.' },
]

const toolExamples = {
  search: `{
  "tool": "search_flights",
  "arguments": {
    "origin": "JFK",
    "destination": "LHR",
    "departure_date": "2025-07-15",
    "return_date": "2025-07-22",
    "adults": 1,
    "cabin_class": "economy"
  }
}`,
  cheapest: `{
  "tool": "search_cheapest_dates",
  "arguments": {
    "origin": "LAX",
    "destination": "NRT",
    "month": "2025-08"
  }
}`,
  calendar: `{
  "tool": "get_price_calendar",
  "arguments": {
    "origin": "SFO",
    "destination": "CDG",
    "month": "2025-09"
  }
}`,
  booking: `{
  "tool": "get_booking_link",
  "arguments": {
    "origin": "ORD",
    "destination": "BCN",
    "departure_date": "2025-06-20",
    "return_date": "2025-06-27"
  }
}`,
}

const claudeConfig = `{
  "mcpServers": {
    "valor-travel": {
      "url": "${MCP_URL}"
    }
  }
}`

function scrollToDocs() {
  document.getElementById('docs')?.scrollIntoView({ behavior: 'smooth' })
}

const faqs = [
  { q: 'Do I need an API key?', a: 'No. Valor Travel is completely free and requires zero authentication. Just mount the MCP URL and start searching.' },
  { q: 'What data sources do you use?', a: 'We aggregate flight data from Travelpayouts/Aviasales, which covers 728+ airlines and 200+ booking agencies worldwide.' },
  { q: 'How accurate are the prices?', a: 'Prices are real-time when possible (via live search) and cached for 5 minutes. Final booking prices may vary slightly.' },
  { q: 'What AI agents work with this?', a: 'Any agent that supports MCP: Claude (Desktop & API), ChatGPT (via Actions), Cursor, Windsurf, and any custom agent using the MCP SDK.' },
  { q: 'Is there a rate limit?', a: 'Free tier: 500 requests/day per IP. Need more? Contact us for unlimited access.' },
  { q: 'How do booking links work?', a: 'Every flight result includes a direct link to Aviasales with the search pre-filled. Users click to see live prices and book.' },
]
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Nav -->
    <nav class="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div class="flex items-center gap-2">
          <span class="text-xl font-bold text-foreground">Valor Travel</span>
          <Badge variant="secondary" class="text-[10px]">MCP</Badge>
        </div>
        <div class="hidden gap-6 md:flex">
          <a href="#features" class="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#docs" class="text-sm text-muted-foreground hover:text-foreground transition-colors">Docs</a>
          <a href="#pricing" class="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          <a href="#faq" class="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
        </div>
        <Button size="sm" @click="copyToClipboard(MCP_URL, 'nav')">
          {{ copied === 'nav' ? 'Copied!' : 'Copy MCP URL' }}
        </Button>
      </div>
    </nav>

    <!-- Hero -->
    <section class="relative overflow-hidden px-6 py-24 md:py-36">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-primary)/15%,_transparent_70%)]" />
      <div class="relative mx-auto max-w-4xl text-center">
        <Badge variant="outline" class="mb-6">No API Key Required</Badge>
        <h1 class="text-4xl font-bold tracking-tight text-foreground sm:text-6xl md:text-7xl">
          Flight search for
          <span class="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">every AI agent</span>
        </h1>
        <p class="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          The simplest travel MCP server. Real-time flights, price calendars, and booking links.
          Zero authentication. Mount in Claude, ChatGPT, or any agent in one line.
        </p>
        <div class="mt-10 flex flex-col items-center gap-4">
          <div class="flex w-full max-w-xl items-center gap-2 rounded-lg border border-border bg-card p-2">
            <code class="flex-1 truncate px-3 text-sm text-muted-foreground">{{ MCP_URL }}</code>
            <Button size="sm" @click="copyToClipboard(MCP_URL, 'hero')">
              {{ copied === 'hero' ? 'Copied!' : 'Copy' }}
            </Button>
          </div>
          <div class="flex gap-3">
            <Button size="lg" @click="copyToClipboard(claudeConfig, 'claude-config')">
              {{ copied === 'claude-config' ? 'Config Copied!' : 'Mount in Claude' }}
            </Button>
            <Button variant="outline" size="lg" @click="scrollToDocs">
              View Docs
            </Button>
          </div>
          <p class="text-xs text-muted-foreground">Free tier: 500 requests/day &mdash; no credit card</p>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section id="features" class="border-t border-border/40 px-6 py-24">
      <div class="mx-auto max-w-6xl">
        <div class="text-center">
          <h2 class="text-3xl font-bold tracking-tight sm:text-4xl">Built for agents, not humans</h2>
          <p class="mt-4 text-muted-foreground">Every design decision optimizes for LLM consumption and agent workflows.</p>
        </div>
        <div class="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card v-for="f in features" :key="f.title" class="border-border/50 transition-colors hover:border-border">
            <CardHeader>
              <div class="mb-2 text-3xl">{{ f.icon }}</div>
              <CardTitle class="text-lg">{{ f.title }}</CardTitle>
              <CardDescription>{{ f.desc }}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </section>

    <!-- How it Works -->
    <section class="border-t border-border/40 bg-card/30 px-6 py-24">
      <div class="mx-auto max-w-4xl">
        <h2 class="text-center text-3xl font-bold tracking-tight sm:text-4xl">Three steps to flight search</h2>
        <div class="mt-16 grid gap-8 md:grid-cols-3">
          <div v-for="s in steps" :key="s.step" class="text-center">
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
              {{ s.step }}
            </div>
            <h3 class="mt-4 text-lg font-semibold">{{ s.title }}</h3>
            <p class="mt-2 text-sm text-muted-foreground">{{ s.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Documentation -->
    <section id="docs" class="border-t border-border/40 px-6 py-24">
      <div class="mx-auto max-w-5xl">
        <h2 class="text-center text-3xl font-bold tracking-tight sm:text-4xl">Documentation</h2>
        <p class="mt-4 text-center text-muted-foreground">Full tool reference with copy-paste examples</p>

        <!-- Quick Start -->
        <Card class="mt-12">
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>Add Valor Travel to your AI agent in seconds</CardDescription>
          </CardHeader>
          <CardContent>
            <h4 class="mb-2 font-medium">Claude Desktop / Claude Code</h4>
            <div class="relative">
              <pre class="overflow-x-auto rounded-md bg-muted p-4 text-sm"><code>{{ claudeConfig }}</code></pre>
              <button
                class="absolute right-3 top-3 rounded bg-background/80 px-2 py-1 text-xs hover:bg-background cursor-pointer"
                @click="copyToClipboard(claudeConfig, 'quickstart')"
              >{{ copied === 'quickstart' ? 'Copied!' : 'Copy' }}</button>
            </div>
            <h4 class="mb-2 mt-6 font-medium">REST API</h4>
            <div class="relative">
              <pre class="overflow-x-auto rounded-md bg-muted p-4 text-sm"><code>curl "https://valor-travel-mcp.ruben-s-org.workers.dev/api/flights/search?origin=JFK&destination=LHR&departure_date=2025-07-15"</code></pre>
              <button
                class="absolute right-3 top-3 rounded bg-background/80 px-2 py-1 text-xs hover:bg-background cursor-pointer"
                @click="copyToClipboard(`curl 'https://valor-travel-mcp.ruben-s-org.workers.dev/api/flights/search?origin=JFK&destination=LHR&departure_date=2025-07-15'`, 'curl')"
              >{{ copied === 'curl' ? 'Copied!' : 'Copy' }}</button>
            </div>
          </CardContent>
        </Card>

        <!-- Tool Reference -->
        <Card class="mt-8">
          <CardHeader>
            <CardTitle>Tool Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs default-value="search">
              <TabsList class="w-full flex-wrap">
                <TabsTrigger value="search">search_flights</TabsTrigger>
                <TabsTrigger value="cheapest">search_cheapest_dates</TabsTrigger>
                <TabsTrigger value="calendar">get_price_calendar</TabsTrigger>
                <TabsTrigger value="booking">get_booking_link</TabsTrigger>
              </TabsList>

              <TabsContent value="search">
                <div class="mt-4 space-y-4">
                  <p class="text-sm text-muted-foreground">Search for real-time flight prices between any two airports. Supports one-way and round-trip.</p>
                  <h4 class="font-medium">Parameters</h4>
                  <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                      <thead><tr class="border-b border-border text-left"><th class="pb-2 pr-4">Param</th><th class="pb-2 pr-4">Type</th><th class="pb-2 pr-4">Required</th><th class="pb-2">Description</th></tr></thead>
                      <tbody class="text-muted-foreground">
                        <tr class="border-b border-border/50"><td class="py-2 pr-4 font-mono text-foreground">origin</td><td class="py-2 pr-4">string</td><td class="py-2 pr-4">Yes</td><td class="py-2">IATA airport code (e.g. JFK)</td></tr>
                        <tr class="border-b border-border/50"><td class="py-2 pr-4 font-mono text-foreground">destination</td><td class="py-2 pr-4">string</td><td class="py-2 pr-4">Yes</td><td class="py-2">IATA airport code (e.g. LHR)</td></tr>
                        <tr class="border-b border-border/50"><td class="py-2 pr-4 font-mono text-foreground">departure_date</td><td class="py-2 pr-4">string</td><td class="py-2 pr-4">Yes</td><td class="py-2">YYYY-MM-DD</td></tr>
                        <tr class="border-b border-border/50"><td class="py-2 pr-4 font-mono text-foreground">return_date</td><td class="py-2 pr-4">string</td><td class="py-2 pr-4">No</td><td class="py-2">YYYY-MM-DD (omit for one-way)</td></tr>
                        <tr class="border-b border-border/50"><td class="py-2 pr-4 font-mono text-foreground">adults</td><td class="py-2 pr-4">number</td><td class="py-2 pr-4">No</td><td class="py-2">1-9 (default: 1)</td></tr>
                        <tr class="border-b border-border/50"><td class="py-2 pr-4 font-mono text-foreground">cabin_class</td><td class="py-2 pr-4">string</td><td class="py-2 pr-4">No</td><td class="py-2">economy, business, first</td></tr>
                        <tr><td class="py-2 pr-4 font-mono text-foreground">max_stops</td><td class="py-2 pr-4">number</td><td class="py-2 pr-4">No</td><td class="py-2">0 = direct only</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <h4 class="font-medium">Example</h4>
                  <div class="relative">
                    <pre class="overflow-x-auto rounded-md bg-muted p-4 text-sm"><code>{{ toolExamples.search }}</code></pre>
                    <button class="absolute right-3 top-3 rounded bg-background/80 px-2 py-1 text-xs hover:bg-background cursor-pointer" @click="copyToClipboard(toolExamples.search, 'ex-search')">{{ copied === 'ex-search' ? 'Copied!' : 'Copy' }}</button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="cheapest">
                <div class="mt-4 space-y-4">
                  <p class="text-sm text-muted-foreground">Find the cheapest flight dates for a route. Returns up to 30 options sorted by price.</p>
                  <h4 class="font-medium">Parameters</h4>
                  <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                      <thead><tr class="border-b border-border text-left"><th class="pb-2 pr-4">Param</th><th class="pb-2 pr-4">Type</th><th class="pb-2 pr-4">Required</th><th class="pb-2">Description</th></tr></thead>
                      <tbody class="text-muted-foreground">
                        <tr class="border-b border-border/50"><td class="py-2 pr-4 font-mono text-foreground">origin</td><td class="py-2 pr-4">string</td><td class="py-2 pr-4">Yes</td><td class="py-2">IATA code</td></tr>
                        <tr class="border-b border-border/50"><td class="py-2 pr-4 font-mono text-foreground">destination</td><td class="py-2 pr-4">string</td><td class="py-2 pr-4">Yes</td><td class="py-2">IATA code</td></tr>
                        <tr><td class="py-2 pr-4 font-mono text-foreground">month</td><td class="py-2 pr-4">string</td><td class="py-2 pr-4">No</td><td class="py-2">YYYY-MM format</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <h4 class="font-medium">Example</h4>
                  <div class="relative">
                    <pre class="overflow-x-auto rounded-md bg-muted p-4 text-sm"><code>{{ toolExamples.cheapest }}</code></pre>
                    <button class="absolute right-3 top-3 rounded bg-background/80 px-2 py-1 text-xs hover:bg-background cursor-pointer" @click="copyToClipboard(toolExamples.cheapest, 'ex-cheap')">{{ copied === 'ex-cheap' ? 'Copied!' : 'Copy' }}</button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="calendar">
                <div class="mt-4 space-y-4">
                  <p class="text-sm text-muted-foreground">Monthly price calendar showing cheapest price per day. Great for finding the optimal travel window.</p>
                  <h4 class="font-medium">Example</h4>
                  <div class="relative">
                    <pre class="overflow-x-auto rounded-md bg-muted p-4 text-sm"><code>{{ toolExamples.calendar }}</code></pre>
                    <button class="absolute right-3 top-3 rounded bg-background/80 px-2 py-1 text-xs hover:bg-background cursor-pointer" @click="copyToClipboard(toolExamples.calendar, 'ex-cal')">{{ copied === 'ex-cal' ? 'Copied!' : 'Copy' }}</button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="booking">
                <div class="mt-4 space-y-4">
                  <p class="text-sm text-muted-foreground">Generate a direct booking link for a specific route and date. Opens Aviasales with search pre-filled.</p>
                  <h4 class="font-medium">Example</h4>
                  <div class="relative">
                    <pre class="overflow-x-auto rounded-md bg-muted p-4 text-sm"><code>{{ toolExamples.booking }}</code></pre>
                    <button class="absolute right-3 top-3 rounded bg-background/80 px-2 py-1 text-xs hover:bg-background cursor-pointer" @click="copyToClipboard(toolExamples.booking, 'ex-book')">{{ copied === 'ex-book' ? 'Copied!' : 'Copy' }}</button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <!-- Endpoints -->
        <Card class="mt-8">
          <CardHeader>
            <CardTitle>REST API Endpoints</CardTitle>
            <CardDescription>Use directly via HTTP — no MCP client needed</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-3 text-sm">
              <div class="flex items-start gap-3 rounded-md bg-muted p-3">
                <Badge variant="outline" class="mt-0.5 shrink-0">GET</Badge>
                <div>
                  <code class="font-medium">/api/flights/search</code>
                  <p class="mt-1 text-muted-foreground">Search flights. Params: origin, destination, departure_date, return_date, adults, cabin_class, max_stops, currency</p>
                </div>
              </div>
              <div class="flex items-start gap-3 rounded-md bg-muted p-3">
                <Badge variant="outline" class="mt-0.5 shrink-0">GET</Badge>
                <div>
                  <code class="font-medium">/api/flights/cheapest</code>
                  <p class="mt-1 text-muted-foreground">Cheapest dates. Params: origin, destination, month</p>
                </div>
              </div>
              <div class="flex items-start gap-3 rounded-md bg-muted p-3">
                <Badge variant="outline" class="mt-0.5 shrink-0">GET</Badge>
                <div>
                  <code class="font-medium">/api/flights/calendar</code>
                  <p class="mt-1 text-muted-foreground">Price calendar. Params: origin, destination, month</p>
                </div>
              </div>
              <div class="flex items-start gap-3 rounded-md bg-muted p-3">
                <Badge variant="outline" class="mt-0.5 shrink-0">GET</Badge>
                <div>
                  <code class="font-medium">/api/flights/booking-link</code>
                  <p class="mt-1 text-muted-foreground">Generate booking URL. Params: origin, destination, departure_date, return_date</p>
                </div>
              </div>
              <div class="flex items-start gap-3 rounded-md bg-muted p-3">
                <Badge variant="outline" class="mt-0.5 shrink-0">POST</Badge>
                <div>
                  <code class="font-medium">/mcp</code>
                  <p class="mt-1 text-muted-foreground">MCP Streamable HTTP endpoint for agent frameworks</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>

    <!-- Pricing -->
    <section id="pricing" class="border-t border-border/40 bg-card/30 px-6 py-24">
      <div class="mx-auto max-w-4xl text-center">
        <h2 class="text-3xl font-bold tracking-tight sm:text-4xl">Simple pricing</h2>
        <p class="mt-4 text-muted-foreground">Start free. Scale when you need to.</p>
        <div class="mt-12 grid gap-6 md:grid-cols-2">
          <Card class="border-border">
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <CardDescription>For personal projects and prototyping</CardDescription>
              <div class="mt-4">
                <span class="text-4xl font-bold">$0</span>
                <span class="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul class="space-y-2 text-sm text-muted-foreground">
                <li class="flex items-center gap-2"><span class="text-green-400">&#10003;</span> 500 requests/day</li>
                <li class="flex items-center gap-2"><span class="text-green-400">&#10003;</span> All 4 MCP tools</li>
                <li class="flex items-center gap-2"><span class="text-green-400">&#10003;</span> REST API access</li>
                <li class="flex items-center gap-2"><span class="text-green-400">&#10003;</span> Real-time search</li>
                <li class="flex items-center gap-2"><span class="text-green-400">&#10003;</span> No API key needed</li>
              </ul>
            </CardContent>
          </Card>
          <Card class="border-primary/50">
            <CardHeader>
              <div class="flex items-center justify-between">
                <CardTitle>Pro</CardTitle>
                <Badge>Coming Soon</Badge>
              </div>
              <CardDescription>For production agents and businesses</CardDescription>
              <div class="mt-4">
                <span class="text-4xl font-bold">$29</span>
                <span class="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul class="space-y-2 text-sm text-muted-foreground">
                <li class="flex items-center gap-2"><span class="text-green-400">&#10003;</span> Unlimited requests</li>
                <li class="flex items-center gap-2"><span class="text-green-400">&#10003;</span> Priority search queue</li>
                <li class="flex items-center gap-2"><span class="text-green-400">&#10003;</span> Webhook notifications</li>
                <li class="flex items-center gap-2"><span class="text-green-400">&#10003;</span> Multi-city search</li>
                <li class="flex items-center gap-2"><span class="text-green-400">&#10003;</span> Dedicated support</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section id="faq" class="border-t border-border/40 px-6 py-24">
      <div class="mx-auto max-w-3xl">
        <h2 class="text-center text-3xl font-bold tracking-tight sm:text-4xl">FAQ</h2>
        <Accordion type="single" collapsible class="mt-12">
          <AccordionItem v-for="(faq, i) in faqs" :key="i" :value="`faq-${i}`">
            <AccordionTrigger>{{ faq.q }}</AccordionTrigger>
            <AccordionContent>
              <p class="text-muted-foreground">{{ faq.a }}</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-border/40 px-6 py-12">
      <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
        <div class="flex items-center gap-2">
          <span class="font-bold">Valor Travel</span>
          <span class="text-sm text-muted-foreground">The no-auth travel MCP for AI agents</span>
        </div>
        <div class="flex gap-6 text-sm text-muted-foreground">
          <a href="https://valor-travel-mcp.ruben-s-org.workers.dev/openapi.json" class="hover:text-foreground transition-colors">OpenAPI Spec</a>
          <a href="https://valor-travel-mcp.ruben-s-org.workers.dev/mcp-manifest.json" class="hover:text-foreground transition-colors">MCP Manifest</a>
          <a href="https://github.com/Ruben-s-Org/valor-travel" class="hover:text-foreground transition-colors">GitHub</a>
        </div>
      </div>
    </footer>
  </div>
</template>
