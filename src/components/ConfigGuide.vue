<script setup lang="ts">
import { ref, computed } from 'vue';

const currentStep = ref(0);

const steps = [
  { title: 'Environment', description: 'Where will you run TwineLine?' },
  { title: 'Platform', description: 'Choose your operating system or cloud provider' },
  { title: 'Configuration', description: 'Select your options' },
  { title: 'Install', description: 'Your tailored install commands' },
];

// Step 0: Environment
const environment = ref<'local' | 'cloud' | null>(null);

// Step 1: Platform
const platform = ref<string | null>(null);
const localPlatforms = ['Windows', 'macOS', 'Linux'];
const cloudPlatforms = ['AWS', 'Google Cloud', 'Azure', 'DigitalOcean'];
const availablePlatforms = computed(() =>
  environment.value === 'local' ? localPlatforms : cloudPlatforms
);

// Step 2: Configuration options
const database = ref<string | null>(null);
const databases = ['PostgreSQL', 'MySQL', 'SQLite'];

// Computed: can advance?
const canAdvance = computed(() => {
  switch (currentStep.value) {
    case 0: return environment.value !== null;
    case 1: return platform.value !== null;
    case 2: return database.value !== null;
    default: return false;
  }
});

// Computed: install commands
const installCommands = computed(() => {
  const lines: string[] = [];

  if (environment.value === 'local') {
    lines.push('# Install TwineLine locally');
    lines.push('git clone https://github.com/twineline/twineline.git');
    lines.push('cd twineline');
    lines.push('npm install');
  } else {
    lines.push(`# Deploy TwineLine to ${platform.value}`);
    lines.push('git clone https://github.com/twineline/twineline.git');
    lines.push('cd twineline');
    lines.push('npm install');
  }

  lines.push('');
  lines.push(`# Configure ${database.value} database`);
  if (database.value === 'SQLite') {
    lines.push('echo "DATABASE_URL=file:./data.db" >> .env');
  } else {
    const port = database.value === 'PostgreSQL' ? '5432' : '3306';
    const scheme = database.value === 'PostgreSQL' ? 'postgresql' : 'mysql';
    lines.push(`echo "DATABASE_URL=${scheme}://user:password@localhost:${port}/twineline" >> .env`);
  }

  lines.push('');
  lines.push('# Start TwineLine');
  lines.push('npm run setup');
  lines.push('npm run start');

  return lines.join('\n');
});

function next() {
  if (canAdvance.value && currentStep.value < steps.length - 1) {
    currentStep.value++;
  }
}

function back() {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
}

function reset() {
  currentStep.value = 0;
  environment.value = null;
  platform.value = null;
  database.value = null;
}

const copied = ref(false);
async function copyCommands() {
  await navigator.clipboard.writeText(installCommands.value);
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2000);
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <!-- Progress Steps -->
    <div class="flex items-center justify-between mb-10">
      <div
        v-for="(step, i) in steps"
        :key="i"
        class="flex items-center"
        :class="{ 'flex-1': i < steps.length - 1 }"
      >
        <div class="flex flex-col items-center">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300"
            :style="
              i < currentStep
                ? 'background: var(--accent); color: #fff;'
                : i === currentStep
                  ? 'background: var(--accent-glow); color: var(--accent); box-shadow: 0 0 0 2px var(--accent);'
                  : 'background: rgba(255,255,255,0.06); color: var(--text-muted);'
            "
          >
            <span v-if="i < currentStep">&#10003;</span>
            <span v-else>{{ i + 1 }}</span>
          </div>
          <span
            class="mt-2 text-xs text-center hidden sm:block"
            :style="i <= currentStep ? 'color: var(--text-primary);' : 'color: var(--text-muted);'"
          >
            {{ step.title }}
          </span>
        </div>
        <div
          v-if="i < steps.length - 1"
          class="flex-1 h-0.5 mx-3 mt-[-1rem] transition-colors duration-300"
          :style="i < currentStep ? 'background: var(--accent);' : 'background: var(--glass-border);'"
        />
      </div>
    </div>

    <!-- Step Content -->
    <div class="glass p-8">
      <h2 class="text-xl font-semibold mb-1" style="color: var(--text-primary);">{{ steps[currentStep].title }}</h2>
      <p class="mb-6" style="color: var(--text-secondary);">{{ steps[currentStep].description }}</p>

      <!-- Step 0: Environment -->
      <div v-if="currentStep === 0" class="grid gap-4 sm:grid-cols-2">
        <button
          v-for="env in (['local', 'cloud'] as const)"
          :key="env"
          class="rounded-xl p-6 text-left transition-all duration-200"
          :style="
            environment === env
              ? 'background: var(--accent-glow); border: 1px solid var(--accent); color: var(--text-primary);'
              : 'background: var(--glass-bg); border: 1px solid var(--glass-border); color: var(--text-primary);'
          "
          @click="environment = env; platform = null"
          @mouseover="($event.currentTarget as HTMLElement).style.borderColor = environment === env ? 'var(--accent)' : 'var(--glass-border-hover)'"
          @mouseout="($event.currentTarget as HTMLElement).style.borderColor = environment === env ? 'var(--accent)' : 'var(--glass-border)'"
        >
          <div class="text-2xl mb-2">{{ env === 'local' ? '&#128187;' : '&#9729;&#65039;' }}</div>
          <div class="font-semibold">{{ env === 'local' ? 'Local Machine' : 'Cloud Server' }}</div>
          <div class="text-sm mt-1" style="color: var(--text-secondary);">
            {{ env === 'local' ? 'Install on your own computer' : 'Deploy to a cloud provider' }}
          </div>
        </button>
      </div>

      <!-- Step 1: Platform -->
      <div v-if="currentStep === 1" class="grid gap-3 sm:grid-cols-2">
        <button
          v-for="p in availablePlatforms"
          :key="p"
          class="rounded-xl p-4 text-left transition-all duration-200"
          :style="
            platform === p
              ? 'background: var(--accent-glow); border: 1px solid var(--accent); color: var(--text-primary);'
              : 'background: var(--glass-bg); border: 1px solid var(--glass-border); color: var(--text-primary);'
          "
          @click="platform = p"
        >
          <div class="font-semibold">{{ p }}</div>
        </button>
      </div>

      <!-- Step 2: Configuration -->
      <div v-if="currentStep === 2" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2" style="color: var(--text-primary);">Database</label>
          <div class="grid gap-3 sm:grid-cols-3">
            <button
              v-for="db in databases"
              :key="db"
              class="rounded-xl p-4 text-center transition-all duration-200"
              :style="
                database === db
                  ? 'background: var(--accent-glow); border: 1px solid var(--accent); color: var(--text-primary);'
                  : 'background: var(--glass-bg); border: 1px solid var(--glass-border); color: var(--text-primary);'
              "
              @click="database = db"
            >
              {{ db }}
            </button>
          </div>
        </div>
      </div>

      <!-- Step 3: Install -->
      <div v-if="currentStep === 3">
        <div class="mb-4 space-y-1 text-sm" style="color: var(--text-secondary);">
          <p><strong style="color: var(--text-primary);">Environment:</strong> {{ environment === 'local' ? 'Local' : 'Cloud' }}</p>
          <p><strong style="color: var(--text-primary);">Platform:</strong> {{ platform }}</p>
          <p><strong style="color: var(--text-primary);">Database:</strong> {{ database }}</p>
        </div>
        <div class="relative">
          <pre class="rounded-xl p-4 text-sm overflow-x-auto" style="background: rgba(0,0,0,0.4); color: var(--text-primary); border: 1px solid var(--glass-border);"><code>{{ installCommands }}</code></pre>
          <button
            class="absolute top-3 right-3 rounded-lg px-3 py-1 text-xs transition-all duration-200"
            style="background: var(--glass-bg); color: var(--text-secondary); border: 1px solid var(--glass-border);"
            @click="copyCommands"
            @mouseover="($event.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'"
            @mouseout="($event.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border)'"
          >
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <div class="flex justify-between mt-6">
      <button
        v-if="currentStep > 0"
        class="btn-outline"
        @click="back"
      >
        Back
      </button>
      <div v-else />

      <button
        v-if="currentStep < steps.length - 1"
        class="btn-accent"
        :style="!canAdvance ? 'opacity: 0.4; cursor: not-allowed;' : ''"
        :disabled="!canAdvance"
        @click="next"
      >
        Continue
      </button>
      <button
        v-else
        class="btn-outline"
        @click="reset"
      >
        Start Over
      </button>
    </div>
  </div>
</template>
