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
            class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors"
            :class="
              i < currentStep
                ? 'bg-indigo-600 text-white'
                : i === currentStep
                  ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-600'
                  : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
            "
          >
            <span v-if="i < currentStep">&#10003;</span>
            <span v-else>{{ i + 1 }}</span>
          </div>
          <span class="mt-2 text-xs text-center hidden sm:block" :class="i <= currentStep ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'">
            {{ step.title }}
          </span>
        </div>
        <div
          v-if="i < steps.length - 1"
          class="flex-1 h-0.5 mx-3 mt-[-1rem]"
          :class="i < currentStep ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'"
        />
      </div>
    </div>

    <!-- Step Content -->
    <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-8">
      <h2 class="text-xl font-semibold mb-1">{{ steps[currentStep].title }}</h2>
      <p class="text-gray-500 mb-6">{{ steps[currentStep].description }}</p>

      <!-- Step 0: Environment -->
      <div v-if="currentStep === 0" class="grid gap-4 sm:grid-cols-2">
        <button
          v-for="env in (['local', 'cloud'] as const)"
          :key="env"
          class="rounded-lg border-2 p-6 text-left transition-colors"
          :class="environment === env ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'"
          @click="environment = env; platform = null"
        >
          <div class="text-2xl mb-2">{{ env === 'local' ? '&#128187;' : '&#9729;&#65039;' }}</div>
          <div class="font-semibold">{{ env === 'local' ? 'Local Machine' : 'Cloud Server' }}</div>
          <div class="text-sm text-gray-500 mt-1">
            {{ env === 'local' ? 'Install on your own computer' : 'Deploy to a cloud provider' }}
          </div>
        </button>
      </div>

      <!-- Step 1: Platform -->
      <div v-if="currentStep === 1" class="grid gap-3 sm:grid-cols-2">
        <button
          v-for="p in availablePlatforms"
          :key="p"
          class="rounded-lg border-2 p-4 text-left transition-colors"
          :class="platform === p ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'"
          @click="platform = p"
        >
          <div class="font-semibold">{{ p }}</div>
        </button>
      </div>

      <!-- Step 2: Configuration -->
      <div v-if="currentStep === 2" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Database</label>
          <div class="grid gap-3 sm:grid-cols-3">
            <button
              v-for="db in databases"
              :key="db"
              class="rounded-lg border-2 p-4 text-center transition-colors"
              :class="database === db ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'"
              @click="database = db"
            >
              {{ db }}
            </button>
          </div>
        </div>
      </div>

      <!-- Step 3: Install -->
      <div v-if="currentStep === 3">
        <div class="mb-4 space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <p><strong>Environment:</strong> {{ environment === 'local' ? 'Local' : 'Cloud' }}</p>
          <p><strong>Platform:</strong> {{ platform }}</p>
          <p><strong>Database:</strong> {{ database }}</p>
        </div>
        <div class="relative">
          <pre class="rounded-lg bg-gray-900 p-4 text-sm text-gray-100 overflow-x-auto"><code>{{ installCommands }}</code></pre>
          <button
            class="absolute top-3 right-3 rounded bg-gray-700 px-3 py-1 text-xs text-gray-300 hover:bg-gray-600 transition-colors"
            @click="copyCommands"
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
        class="rounded-lg border border-gray-300 dark:border-gray-700 px-5 py-2 text-sm font-medium hover:border-gray-400 transition-colors"
        @click="back"
      >
        Back
      </button>
      <div v-else />

      <button
        v-if="currentStep < steps.length - 1"
        class="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="!canAdvance"
        @click="next"
      >
        Continue
      </button>
      <button
        v-else
        class="rounded-lg border border-gray-300 dark:border-gray-700 px-5 py-2 text-sm font-medium hover:border-gray-400 transition-colors"
        @click="reset"
      >
        Start Over
      </button>
    </div>
  </div>
</template>
