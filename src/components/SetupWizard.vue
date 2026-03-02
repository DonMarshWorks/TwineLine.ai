<script setup lang="ts">
import { ref, computed, watch } from "vue";

const currentStep = ref(0);

// Configuration choices
type ServerChoice = "local" | "cloud" | null;
type DisplayChoice = "smarttv" | "stick" | "computer" | null;
type PlatformChoice = "windows" | "macos" | "linux" | null;

const server = ref<ServerChoice>(null);
const display = ref<DisplayChoice>(null);
const platform = ref<PlatformChoice>(null);
const copied = ref(false);

const isCloud = computed(() => server.value === "cloud");
const needsDisplayStep = computed(() => display.value !== "computer");

// Both choices made
const configComplete = computed(
  () => server.value !== null && display.value !== null,
);

// Dynamic step definitions based on chosen path
interface StepDef {
  key: string;
  label: string;
}

const steps = computed<StepDef[]>(() => {
  const result: StepDef[] = [
    { key: "choose-server", label: "Choose server" },
    { key: "choose-display", label: "Choose display" },
  ];

  if (isCloud.value) {
    result.push({ key: "cloud-server", label: "Cloud server" });
    result.push({ key: "install-cloud", label: "Wait for install" });
  } else {
    result.push({ key: "install-local", label: "Install server" });
  }

  if (needsDisplayStep.value) {
    result.push({
      key: "display",
      label:
        display.value === "smarttv"
          ? "Set up TV"
          : display.value === "stick"
            ? "Smart TV device"
            : "Set up display",
    });
  }

  return result;
});

const currentStepKey = computed(() => {
  if (currentStep.value < steps.value.length) {
    return steps.value[currentStep.value].key;
  }
  return "choose-server";
});

const isLastStep = computed(
  () => currentStep.value === steps.value.length - 1 && currentStep.value > 1,
);

// Keep currentStep in bounds when the step list changes
watch(steps, (newSteps) => {
  if (currentStep.value >= newSteps.length) {
    currentStep.value = newSteps.length - 1;
  }
});

function selectServer(choice: ServerChoice) {
  server.value = choice;
}

function advance() {
  if (currentStep.value === 0 && !server.value) return;
  if (currentStep.value === 1 && !display.value) return;
  if (currentStep.value < steps.value.length - 1) {
    currentStep.value++;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function goBack() {
  if (currentStep.value > 0) {
    currentStep.value--;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function goToStep(index: number) {
  if (index <= currentStep.value) {
    currentStep.value = index;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function reset() {
  currentStep.value = 0;
  server.value = null;
  display.value = null;
  platform.value = null;
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <!-- Progress Stepper -->
    <div class="flex items-start justify-between mb-10">
      <div
        v-for="(step, i) in steps"
        :key="step.key"
        class="flex items-start"
        :class="{ 'flex-1': i < steps.length - 1 }"
      >
        <div
          class="flex flex-col items-center"
          :class="i < currentStep ? 'cursor-pointer group' : ''"
          @click="goToStep(i)"
        >
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300"
            :class="
              i < currentStep
                ? 'group-hover:scale-110 group-hover:shadow-[0_0_12px_rgba(212,160,86,0.4)]'
                : ''
            "
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
            class="mt-2 text-xs text-center hidden sm:block max-w-[5.5rem] leading-tight"
            :style="
              i <= currentStep
                ? 'color: var(--text-primary);'
                : 'color: var(--text-muted);'
            "
          >
            {{ step.label }}
          </span>
        </div>
        <div
          v-if="i < steps.length - 1"
          class="flex-1 h-0.5 mx-1 sm:mx-3 mt-[0.9375rem] transition-colors duration-300"
          :style="
            i < currentStep
              ? 'background: var(--accent);'
              : 'background: var(--glass-border);'
          "
        />
      </div>
    </div>

    <!-- Config summary banner (shown after both choices are made, from step 2 onward) -->
    <div
      v-if="currentStep >= 2 && configComplete"
      class="glass p-4 mb-6 flex flex-wrap items-center gap-3 text-sm"
      style="border-color: var(--accent); border-width: 1px"
    >
      <span style="color: var(--text-primary); font-weight: 600"
        >Your setup:</span
      >
      <span
        class="px-3 py-1 rounded-full text-xs font-medium"
        style="background: var(--accent-glow); color: var(--accent)"
      >
        {{ isCloud ? "Cloud server" : "Your computer" }}
      </span>
      <span
        class="px-3 py-1 rounded-full text-xs font-medium"
        style="background: var(--accent-glow); color: var(--accent)"
      >
        {{
          display === "smarttv"
            ? "Smart TV"
            : display === "stick"
              ? "Smart TV device"
              : "Computer + TV"
        }}
      </span>
      <button
        class="ml-auto text-xs underline cursor-pointer transition-colors duration-200 hover:!text-[var(--accent)]"
        style="color: var(--text-muted)"
        @click="reset"
      >
        Change
      </button>
    </div>

    <!-- Partial banner on step 1 (choose-display) showing server choice -->
    <div
      v-if="currentStep === 1 && server"
      class="glass p-4 mb-6 flex flex-wrap items-center gap-3 text-sm"
      style="border-color: var(--accent); border-width: 1px"
    >
      <span style="color: var(--text-primary); font-weight: 600">Server:</span>
      <span
        class="px-3 py-1 rounded-full text-xs font-medium"
        style="background: var(--accent-glow); color: var(--accent)"
      >
        {{ isCloud ? "Cloud server" : "Your computer" }}
      </span>
      <button
        class="ml-auto text-xs underline cursor-pointer transition-colors duration-200 hover:!text-[var(--accent)]"
        style="color: var(--text-muted)"
        @click="reset"
      >
        Change
      </button>
    </div>

    <!-- ==================== STEP 1: Choose Server ==================== -->
    <div v-if="currentStepKey === 'choose-server'" class="glass p-6 sm:p-8">
      <h2 class="text-xl font-semibold mb-1" style="color: var(--text-primary)">
        Where will the server run?
      </h2>
      <p class="mb-6" style="color: var(--text-secondary)">
        The server builds your slideshows. It runs on Windows, macOS, or Linux.
      </p>

      <div class="space-y-4">
        <label
          class="group flex items-start gap-3 cursor-pointer"
          @click="selectServer('local')"
        >
          <span
            class="mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 group-hover:!border-[var(--accent)]"
            :style="
              server === 'local'
                ? 'border-color: var(--accent);'
                : 'border-color: var(--radio-border);'
            "
          >
            <span
              v-if="server === 'local'"
              class="w-2.5 h-2.5 rounded-full"
              style="background: var(--accent)"
            />
          </span>
          <span>
            <span
              class="font-semibold transition-colors duration-200 group-hover:!text-[var(--accent)]"
              style="color: var(--text-primary)"
              >My own computer (free)</span
            >
            <span
              class="block text-sm mt-0.5"
              style="color: var(--text-secondary)"
            >
              Runs when your computer is on. Accessible only to display devices
              on your local network.
            </span>
          </span>
        </label>

        <label
          class="group flex items-start gap-3 cursor-pointer"
          @click="selectServer('cloud')"
        >
          <span
            class="mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 group-hover:!border-[var(--accent)]"
            :style="
              server === 'cloud'
                ? 'border-color: var(--accent);'
                : 'border-color: var(--radio-border);'
            "
          >
            <span
              v-if="server === 'cloud'"
              class="w-2.5 h-2.5 rounded-full"
              style="background: var(--accent)"
            />
          </span>
          <span>
            <span
              class="font-semibold transition-colors duration-200 group-hover:!text-[var(--accent)]"
              style="color: var(--text-primary)"
              >Cloud server (at least 1 month free)</span
            >
            <span
              class="block text-sm mt-0.5"
              style="color: var(--text-secondary)"
            >
              Always on, accessible from anywhere. Free credit covers at least
              one month, then ~$7/month.
            </span>
          </span>
        </label>
      </div>
    </div>

    <!-- ==================== STEP 2: Choose Display ==================== -->
    <div v-if="currentStepKey === 'choose-display'" class="glass p-6 sm:p-8">
      <h2 class="text-xl font-semibold mb-1" style="color: var(--text-primary)">
        How will it display on your TV?
      </h2>
      <p class="mb-6" style="color: var(--text-secondary)">
        Pick the option that matches your TV. You can change this later.
      </p>

      <div class="space-y-4">
        <label
          class="group flex items-start gap-3 cursor-pointer"
          @click="display = 'smarttv'"
        >
          <span
            class="mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 group-hover:!border-[var(--accent)]"
            :style="
              display === 'smarttv'
                ? 'border-color: var(--accent);'
                : 'border-color: var(--radio-border);'
            "
          >
            <span
              v-if="display === 'smarttv'"
              class="w-2.5 h-2.5 rounded-full"
              style="background: var(--accent)"
            />
          </span>
          <span>
            <span
              class="font-semibold transition-colors duration-200 group-hover:!text-[var(--accent)]"
              style="color: var(--text-primary)"
              >My TV has Google TV or Fire TV built in</span
            >
            <span
              class="block text-sm mt-0.5"
              style="color: var(--text-secondary)"
            >
              No extra hardware needed. Common brands: Sony, TCL, Hisense,
              Amazon Fire TV Edition, Toshiba, Insignia.
            </span>
          </span>
        </label>

        <label
          class="group flex items-start gap-3 cursor-pointer"
          @click="display = 'stick'"
        >
          <span
            class="mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 group-hover:!border-[var(--accent)]"
            :style="
              display === 'stick'
                ? 'border-color: var(--accent);'
                : 'border-color: var(--radio-border);'
            "
          >
            <span
              v-if="display === 'stick'"
              class="w-2.5 h-2.5 rounded-full"
              style="background: var(--accent)"
            />
          </span>
          <span>
            <span
              class="font-semibold transition-colors duration-200 group-hover:!text-[var(--accent)]"
              style="color: var(--text-primary)"
              >I have an older or basic TV</span
            >
            <span
              class="block text-sm mt-0.5"
              style="color: var(--text-secondary)"
            >
              You will need a smart TV device that plugs into your TV's HDMI
              port:
              <a
                href="https://www.walmart.com/ip/ONN-4K-PLUS/15557424949"
                target="_blank"
                rel="noopener"
                style="color: var(--accent)"
                class="underline"
                >onn 4K Plus (~$30)</a
              >
              or
              <a
                href="https://www.amazon.com/Amazon-newest-AI-powered-Search-million/dp/B0F7Z4QZTT/"
                target="_blank"
                rel="noopener"
                style="color: var(--accent)"
                class="underline"
                >Fire TV Stick 4K Plus (~$30)</a
              >.
            </span>
          </span>
        </label>

        <label
          class="group flex items-start gap-3 cursor-pointer"
          @click="display = 'computer'"
        >
          <span
            class="mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 group-hover:!border-[var(--accent)]"
            :style="
              display === 'computer'
                ? 'border-color: var(--accent);'
                : 'border-color: var(--radio-border);'
            "
          >
            <span
              v-if="display === 'computer'"
              class="w-2.5 h-2.5 rounded-full"
              style="background: var(--accent)"
            />
          </span>
          <span>
            <span
              class="font-semibold transition-colors duration-200 group-hover:!text-[var(--accent)]"
              style="color: var(--text-primary)"
              >I will connect a computer to my TV</span
            >
            <span
              class="block text-sm mt-0.5"
              style="color: var(--text-secondary)"
            >
              A computer connects to the TV with an HDMI cable and displays the
              slideshow fullscreen.
            </span>
          </span>
        </label>
      </div>
    </div>

    <!-- ==================== STEP: Cloud Server ==================== -->
    <div v-if="currentStepKey === 'cloud-server'" class="glass p-6 sm:p-8">
      <h2 class="text-xl font-semibold mb-4" style="color: var(--text-primary)">
        Set up your cloud server
      </h2>
      <div class="space-y-4 text-sm" style="color: var(--text-secondary)">
        <p>
          Hetzner is a cloud hosting provider. You are renting a small server
          that runs TwineLine 24/7 &mdash; even when your computer at home is
          off.
        </p>

        <h3
          class="font-semibold text-base !mt-6"
          style="color: var(--text-primary)"
        >
          Create your account
        </h3>
        <ol class="list-decimal list-inside space-y-2 ml-1">
          <li>
            <a href="#" style="color: var(--accent)" class="underline"
              >Go to Hetzner</a
            >
            using our referral link to get at least one free month of hosting.
            Click
            <strong style="color: var(--text-primary)">Register now</strong> to
            create an account.
          </li>
          <li>
            You will need a payment method (credit card or PayPal) and a phone
            number for verification. If you are in the US, prefix your phone
            number with
            <strong style="color: var(--text-primary)">+1</strong> (for example,
            +1 555 123 4567).
          </li>
          <li>
            Hetzner requires identity verification for new accounts. This
            usually takes a few minutes &mdash; follow their prompts to complete
            it.
          </li>
          <li>
            Hetzner may ask you to set up two-factor authentication (2FA). You
            can skip this for now &mdash; it is not required to continue.
          </li>
        </ol>

        <h3
          class="font-semibold text-base !mt-6"
          style="color: var(--text-primary)"
        >
          Create your server
        </h3>
        <ol class="list-decimal list-inside space-y-2 ml-1">
          <li>
            In the Hetzner Cloud Console, click
            <strong style="color: var(--text-primary)">+ CREATE SERVER</strong>.
          </li>
          <li>
            Choose these settings:
            <ul class="list-disc list-inside ml-4 mt-1 space-y-1">
              <li>
                <strong style="color: var(--text-primary)">Location:</strong>
                Helsinki or Nuremberg (these are the locations where TwineLine's
                recommended server type is available).
              </li>
              <li>
                <strong style="color: var(--text-primary)">Image:</strong>
                Ubuntu 24.04.
              </li>
              <li>
                <strong style="color: var(--text-primary)">Type:</strong>
                Cost-Optimized &rarr; x86 &rarr;
                <strong style="color: var(--text-primary)">CX23</strong> (2
                vCPU, 4 GB RAM, ~$7/month). This handles photos, video, and AI
                analysis &mdash; no need to choose a higher tier.
              </li>
              <li>
                <strong style="color: var(--text-primary)">SSH keys:</strong>
                Skip this section &mdash; do not add an SSH key. Hetzner will
                email you the root password in case you ever need it for
                troubleshooting.
              </li>
            </ul>
          </li>
          <li>
            Scroll down to the
            <strong style="color: var(--text-primary)">Cloud config</strong>
            field. Copy the entire script below and paste it into this field.
            This tells the server to install TwineLine automatically when it
            starts &mdash; no terminal or command line needed.
            <div class="relative mt-2">
              <pre
                class="rounded-xl p-4 text-sm overflow-x-auto"
                style="
                  background: rgba(0, 0, 0, 0.4);
                  color: var(--text-primary);
                  border: 1px solid var(--glass-border);
                "
              ><code>#cloud-config
runcmd:
  - curl -fsSL https://twineline.app/install.sh | bash</code></pre>
              <button
                class="absolute top-3 right-3 rounded-lg px-3 py-1 text-xs cursor-pointer transition-all duration-200 hover:!border-[var(--accent)] hover:!text-[var(--accent)]"
                style="
                  background: var(--glass-bg);
                  color: var(--text-secondary);
                  border: 1px solid var(--glass-border);
                "
                @click="
                  copyText(
                    '#cloud-config\nruncmd:\n  - curl -fsSL https://twineline.app/install.sh | bash',
                  )
                "
              >
                {{ copied ? "Copied!" : "Copy" }}
              </button>
            </div>
            <p class="text-xs mt-2" style="color: var(--text-muted)">
              You can
              <a
                href="https://twineline.app/install.sh"
                target="_blank"
                rel="noopener"
                style="color: var(--accent)"
                >review the install script</a
              >
              before running.
            </p>
          </li>
          <li>
            Leave all other settings at their defaults (no volumes, no
            firewalls, no backups needed).
          </li>
          <li>
            Click
            <strong style="color: var(--text-primary)"
              >Create &amp; Buy Now</strong
            >. The server will be created in about 30 seconds.
          </li>
          <li>
            You will see an IP address on the dashboard (something like
            <code style="color: var(--accent)">95.217.42.100</code>). Write this
            down or copy it &mdash; you will need it in the next step.
          </li>
        </ol>
      </div>
    </div>

    <!-- ==================== STEP: Wait for TwineLine (cloud) ==================== -->
    <div v-if="currentStepKey === 'install-cloud'" class="glass p-6 sm:p-8">
      <h2 class="text-xl font-semibold mb-4" style="color: var(--text-primary)">
        Wait for TwineLine to install
      </h2>
      <div class="space-y-3 text-sm" style="color: var(--text-secondary)">
        <p>
          The setup script you pasted runs automatically when the server starts.
          It installs everything TwineLine needs &mdash; without any action from
          you.
        </p>
        <p>
          <strong style="color: var(--text-primary)"
            >This takes about 10 minutes.</strong
          >
          There is nothing to watch or click during this time.
        </p>
        <p>
          After 10 minutes, open a browser on your phone, tablet, or computer
          and go to:
        </p>
        <pre
          class="rounded-xl p-4 text-sm overflow-x-auto"
          style="
            background: rgba(0, 0, 0, 0.4);
            color: var(--text-primary);
            border: 1px solid var(--glass-border);
          "
        ><code>http://YOUR_SERVER_IP</code></pre>
        <p>
          Replace <code style="color: var(--accent)">YOUR_SERVER_IP</code> with
          the IP address from the previous step (for example,
          <code style="color: var(--accent)">http://95.217.42.100</code>).
        </p>
        <p>
          You should see the TwineLine settings screen. Your
          {{ display === "smarttv" ? "TV" : "smart TV device" }} will also use
          this address to display slideshows.
        </p>
      </div>

      <details
        class="mt-4 rounded-xl p-4"
        style="
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--glass-border);
        "
      >
        <summary
          class="text-sm font-medium cursor-pointer"
          style="color: var(--text-primary)"
        >
          It has been more than 15 minutes and I cannot reach my server
        </summary>
        <div
          class="mt-3 text-sm space-y-2"
          style="color: var(--text-secondary)"
        >
          <p>
            <strong style="color: var(--text-primary)"
              >Check the address:</strong
            >
            Make sure you are using
            <code style="color: var(--accent)">http://</code> (not
            <code style="color: var(--accent)">https://</code>) and the correct
            IP address from the Hetzner dashboard.
          </p>
          <p>
            <strong style="color: var(--text-primary)"
              >Check the Cloud config:</strong
            >
            In the Hetzner Cloud Console, click on your server's name and verify
            that the Cloud config script was included. It should start with
            <code style="color: var(--accent)">#cloud-config</code> on the first
            line. If it was not included, you can delete the server and create a
            new one &mdash; you are only charged for the time a server exists.
          </p>
          <p>
            <strong style="color: var(--text-primary)"
              >Still not working:</strong
            >
            Delete the server and create a new one, making sure to paste the
            full Cloud config script before clicking Create. This is the
            quickest way to start fresh.
          </p>
        </div>
      </details>
    </div>

    <!-- ==================== STEP: Install Server (local) ==================== -->
    <div v-if="currentStepKey === 'install-local'" class="glass p-6 sm:p-8">
      <h2 class="text-xl font-semibold mb-4" style="color: var(--text-primary)">
        Install TwineLine server on your computer
      </h2>

      <!-- Platform tabs -->
      <div class="flex gap-2 mb-4">
        <button
          v-for="p in ['windows', 'macos', 'linux'] as const"
          :key="p"
          class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
          :class="
            platform !== p
              ? 'cursor-pointer hover:!border-[var(--accent)] hover:!text-[var(--accent)]'
              : 'cursor-default'
          "
          :style="
            platform === p
              ? 'background: var(--accent); color: #fff;'
              : 'background: var(--glass-bg); color: var(--text-secondary); border: 1px solid var(--glass-border);'
          "
          @click="platform = p"
        >
          {{ p === "windows" ? "Windows" : p === "macos" ? "macOS" : "Linux" }}
        </button>
      </div>

      <!-- Windows instructions -->
      <div
        v-if="platform === 'windows'"
        class="space-y-3 text-sm"
        style="color: var(--text-secondary)"
      >
        <p>
          On the computer where you want to run the server, right-click the
          <strong style="color: var(--text-primary)">Windows icon</strong> in
          the taskbar (bottom of your screen) and choose
          <strong style="color: var(--text-primary)">Terminal (Admin)</strong>.
          This opens a text window where you can run the installer.
        </p>
        <p>
          Copy the command below and paste it into the terminal window. If you
          are reading this on a different device, you can type it by hand.
          Important: every character matters, so double-check before pressing
          Enter.
        </p>
        <div class="relative">
          <pre
            class="rounded-xl p-4 text-sm overflow-x-auto"
            style="
              background: rgba(0, 0, 0, 0.4);
              color: var(--text-primary);
              border: 1px solid var(--glass-border);
            "
          ><code>irm https://twineline.app/install.ps1 | iex</code></pre>
          <button
            class="absolute top-3 right-3 rounded-lg px-3 py-1 text-xs cursor-pointer transition-all duration-200 hover:!border-[var(--accent)] hover:!text-[var(--accent)]"
            style="
              background: var(--glass-bg);
              color: var(--text-secondary);
              border: 1px solid var(--glass-border);
            "
            @click="copyText('irm https://twineline.app/install.ps1 | iex')"
          >
            {{ copied ? "Copied!" : "Copy" }}
          </button>
        </div>
        <p>
          This command downloads the TwineLine installer and runs it. The
          installer will set up all the software TwineLine needs behind the
          scenes &mdash; the whole process takes about 5&ndash;10 minutes.
        </p>
        <p>
          The installer will ask how you want to use this computer.
          <template v-if="display === 'computer'">
            Since you are connecting this computer directly to your TV, choose
            <strong style="color: var(--text-primary)"
              >&ldquo;Server + Kiosk&rdquo;</strong
            >. This runs TwineLine and displays the slideshow fullscreen on the
            connected screen.
          </template>
          <template v-else>
            Since your
            {{ display === "smarttv" ? "TV" : "smart TV device" }} will be the
            display, choose
            <strong style="color: var(--text-primary)"
              >&ldquo;Server only&rdquo;</strong
            >. This runs the server on your computer, and your
            {{ display === "smarttv" ? "TV" : "smart TV device" }} connects to
            it over WiFi.
          </template>
        </p>
        <p>
          During installation, Windows Defender Firewall may ask to allow
          TwineLine to communicate on your network. Click
          <strong style="color: var(--text-primary)">Allow</strong> &mdash;
          TwineLine needs this to send slideshows to your display devices over
          WiFi.
        </p>
        <p>When the installer finishes, you should see something like:</p>
        <pre
          class="rounded-xl p-4 text-sm overflow-x-auto"
          style="
            background: rgba(0, 0, 0, 0.4);
            color: var(--text-primary);
            border: 1px solid var(--glass-border);
          "
        ><code>TwineLine is running in the background.

Access TwineLine from any device on your network:
  http://192.168.1.42

You can close this window whenever you like.</code></pre>
        <p>
          The numbers after
          <code style="color: var(--accent)">http://</code> are your
          server&rsquo;s address on your home network. You will need this
          address in the next step to connect your display. Write it down or
          take a photo of the screen so you have it handy.
        </p>
        <details
          class="mt-4 rounded-xl p-4"
          style="
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid var(--glass-border);
          "
        >
          <summary
            class="font-medium cursor-pointer"
            style="color: var(--text-primary)"
          >
            Something went wrong?
          </summary>
          <div class="mt-3 space-y-2" style="color: var(--text-secondary)">
            <p>
              <strong style="color: var(--text-primary)"
                >Terminal (Admin) is not available:</strong
              >
              Search for
              <strong style="color: var(--text-primary)">PowerShell</strong> in
              the Start menu, right-click it, and choose
              <strong style="color: var(--text-primary)"
                >Run as administrator</strong
              >.
            </p>
            <p>
              <strong style="color: var(--text-primary)"
                >The command looks stuck:</strong
              >
              The installer downloads several large packages, so it can appear
              to pause for a minute or two. The installer will tell you when to
              reboot or close the window.
            </p>
          </div>
        </details>
      </div>

      <!-- macOS instructions -->
      <div
        v-if="platform === 'macos'"
        class="space-y-3 text-sm"
        style="color: var(--text-secondary)"
      >
        <p>
          On the computer where you want to run the server, open
          <strong style="color: var(--text-primary)">Terminal</strong>. You can
          find it by pressing
          <strong style="color: var(--text-primary)">Cmd + Space</strong> and
          typing &ldquo;Terminal&rdquo;. This opens a text window where you can
          run the installer.
        </p>
        <p>
          Copy the command below and paste it into the terminal window. If you
          are reading this on a different device, you can type it by hand.
          Important: every character matters, so double-check before pressing
          Enter.
        </p>
        <div class="relative">
          <pre
            class="rounded-xl p-4 text-sm overflow-x-auto"
            style="
              background: rgba(0, 0, 0, 0.4);
              color: var(--text-primary);
              border: 1px solid var(--glass-border);
            "
          ><code>curl -fsSL https://twineline.app/install.sh | bash</code></pre>
          <button
            class="absolute top-3 right-3 rounded-lg px-3 py-1 text-xs cursor-pointer transition-all duration-200 hover:!border-[var(--accent)] hover:!text-[var(--accent)]"
            style="
              background: var(--glass-bg);
              color: var(--text-secondary);
              border: 1px solid var(--glass-border);
            "
            @click="
              copyText('curl -fsSL https://twineline.app/install.sh | bash')
            "
          >
            {{ copied ? "Copied!" : "Copy" }}
          </button>
        </div>
        <p class="text-xs mt-2" style="color: var(--text-muted)">
          You can
          <a
            href="https://twineline.app/install.sh"
            target="_blank"
            rel="noopener"
            style="color: var(--accent)"
            >review the install script</a
          >
          before running.
        </p>
        <p>
          This command downloads the TwineLine installer and runs it. The
          installer will set up all the software TwineLine needs behind the
          scenes &mdash; the whole process takes about 5&ndash;10 minutes.
        </p>
        <p>
          The installer may ask for your password at certain points. This is
          your Mac login password &mdash; you will not see any characters as you
          type it, which is normal. Press Enter after typing it.
        </p>
        <p>
          The installer will ask how you want to use this computer.
          <template v-if="display === 'computer'">
            Since you are connecting this computer directly to your TV, choose
            <strong style="color: var(--text-primary)"
              >&ldquo;Server + Kiosk&rdquo;</strong
            >. This runs TwineLine and displays the slideshow fullscreen on the
            connected screen.
          </template>
          <template v-else>
            Since your
            {{ display === "smarttv" ? "TV" : "smart TV device" }} will be the
            display, choose
            <strong style="color: var(--text-primary)"
              >&ldquo;Server only&rdquo;</strong
            >. This runs the server on your computer, and your
            {{ display === "smarttv" ? "TV" : "smart TV device" }} connects to
            it over WiFi.
          </template>
        </p>
        <p>When the installer finishes, you should see something like:</p>
        <pre
          class="rounded-xl p-4 text-sm overflow-x-auto"
          style="
            background: rgba(0, 0, 0, 0.4);
            color: var(--text-primary);
            border: 1px solid var(--glass-border);
          "
        ><code>TwineLine is running in the background.

Access TwineLine from any device on your network:
  http://192.168.1.42

You can close this window whenever you like.</code></pre>
        <p>
          The numbers after
          <code style="color: var(--accent)">http://</code> are your
          server&rsquo;s address on your home network. You will need this
          address in the next step to connect your display. Write it down or
          take a photo of the screen so you have it handy.
        </p>
        <details
          class="mt-4 rounded-xl p-4"
          style="
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid var(--glass-border);
          "
        >
          <summary
            class="font-medium cursor-pointer"
            style="color: var(--text-primary)"
          >
            Something went wrong?
          </summary>
          <div class="mt-3 space-y-2" style="color: var(--text-secondary)">
            <p>
              <strong style="color: var(--text-primary)"
                >The command looks stuck:</strong
              >
              The installer downloads several large packages, so it can appear
              to pause for a minute or two. The installer will tell you when to
              reboot or close the window.
            </p>
            <p>
              <strong style="color: var(--text-primary)"
                >Password prompt does nothing:</strong
              >
              When macOS asks for your password in the terminal, it hides what
              you type on purpose. Type your Mac login password and press Enter,
              even though nothing appears on screen.
            </p>
            <p>
              <strong style="color: var(--text-primary)"
                >Permission denied:</strong
              >
              Try running the command with
              <code style="color: var(--accent)">sudo</code> in front:
              <code style="color: var(--accent)"
                >sudo curl -fsSL https://twineline.app/install.sh | bash</code
              >
            </p>
            <p>
              <strong style="color: var(--text-primary)"
                >Firewall blocking connections:</strong
              >
              Go to System Settings &gt; Network &gt; Firewall and make sure
              incoming connections are allowed for TwineLine.
            </p>
          </div>
        </details>
      </div>

      <!-- Linux instructions -->
      <div
        v-if="platform === 'linux'"
        class="space-y-3 text-sm"
        style="color: var(--text-secondary)"
      >
        <p>
          On the computer where you want to run the server, open a terminal
          window. On most Linux desktops you can press
          <strong style="color: var(--text-primary)">Ctrl + Alt + T</strong> to
          open one. This is a text window where you can run the installer.
        </p>
        <p>
          Copy the command below and paste it into the terminal window. If you
          are reading this on a different device, you can type it by hand.
          Important: every character matters, so double-check before pressing
          Enter.
        </p>
        <div class="relative">
          <pre
            class="rounded-xl p-4 text-sm overflow-x-auto"
            style="
              background: rgba(0, 0, 0, 0.4);
              color: var(--text-primary);
              border: 1px solid var(--glass-border);
            "
          ><code>curl -fsSL https://twineline.app/install.sh | bash</code></pre>
          <button
            class="absolute top-3 right-3 rounded-lg px-3 py-1 text-xs cursor-pointer transition-all duration-200 hover:!border-[var(--accent)] hover:!text-[var(--accent)]"
            style="
              background: var(--glass-bg);
              color: var(--text-secondary);
              border: 1px solid var(--glass-border);
            "
            @click="
              copyText('curl -fsSL https://twineline.app/install.sh | bash')
            "
          >
            {{ copied ? "Copied!" : "Copy" }}
          </button>
        </div>
        <p class="text-xs mt-2" style="color: var(--text-muted)">
          You can
          <a
            href="https://twineline.app/install.sh"
            target="_blank"
            rel="noopener"
            style="color: var(--accent)"
            >review the install script</a
          >
          before running.
        </p>
        <p>
          This command downloads the TwineLine installer and runs it. The
          installer will set up all the software TwineLine needs behind the
          scenes &mdash; the whole process takes about 5&ndash;10 minutes.
        </p>
        <p>
          The installer may ask for your password. You will not see any
          characters as you type it, which is normal. Type your password and
          press Enter.
        </p>
        <p>
          The installer will ask how you want to use this computer.
          <template v-if="display === 'computer'">
            Since you are connecting this computer directly to your TV, choose
            <strong style="color: var(--text-primary)"
              >&ldquo;Server + Kiosk&rdquo;</strong
            >. This runs TwineLine and displays the slideshow fullscreen on the
            connected screen.
          </template>
          <template v-else>
            Since your
            {{ display === "smarttv" ? "TV" : "smart TV device" }} will be the
            display, choose
            <strong style="color: var(--text-primary)"
              >&ldquo;Server only&rdquo;</strong
            >. This runs the server on your computer, and your
            {{ display === "smarttv" ? "TV" : "smart TV device" }} connects to
            it over WiFi.
          </template>
        </p>
        <p>When the installer finishes, you should see something like:</p>
        <pre
          class="rounded-xl p-4 text-sm overflow-x-auto"
          style="
            background: rgba(0, 0, 0, 0.4);
            color: var(--text-primary);
            border: 1px solid var(--glass-border);
          "
        ><code>TwineLine is running in the background.

Access TwineLine from any device on your network:
  http://192.168.1.42

You can close this window whenever you like.</code></pre>
        <p>
          The numbers after
          <code style="color: var(--accent)">http://</code> are your
          server&rsquo;s address on your home network. You will need this
          address in the next step to connect your display. Write it down or
          take a photo of the screen so you have it handy.
        </p>
        <details
          class="mt-4 rounded-xl p-4"
          style="
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid var(--glass-border);
          "
        >
          <summary
            class="font-medium cursor-pointer"
            style="color: var(--text-primary)"
          >
            Something went wrong?
          </summary>
          <div class="mt-3 space-y-2" style="color: var(--text-secondary)">
            <p>
              <strong style="color: var(--text-primary)"
                >The command looks stuck:</strong
              >
              The installer downloads several large packages, so it can appear
              to pause for a minute or two. The installer will tell you when to
              reboot or close the window.
            </p>
            <p>
              <strong style="color: var(--text-primary)"
                >Permission denied:</strong
              >
              Try running the command with
              <code style="color: var(--accent)">sudo</code> in front:
              <code style="color: var(--accent)"
                >sudo curl -fsSL https://twineline.app/install.sh | bash</code
              >
            </p>
            <p>
              <strong style="color: var(--text-primary)"
                >curl not found:</strong
              >
              Install it with
              <code style="color: var(--accent)">sudo apt install curl</code>
              (Debian/Ubuntu) or
              <code style="color: var(--accent)">sudo dnf install curl</code>
              (Fedora), then try again.
            </p>
            <p>
              <strong style="color: var(--text-primary)"
                >Firewall blocking connections:</strong
              >
              You may need to allow connections on port 80. For example:
              <code style="color: var(--accent)">sudo ufw allow 80</code>
              (Ubuntu) or
              <code style="color: var(--accent)"
                >sudo firewall-cmd --add-port=80/tcp --permanent</code
              >
              (Fedora).
            </p>
          </div>
        </details>
      </div>

      <!-- No platform selected yet -->
      <div
        v-if="!platform"
        class="text-sm text-center py-4"
        style="color: var(--text-muted)"
      >
        Select your operating system above to see install instructions.
      </div>
    </div>

    <!-- ==================== STEP: Set up Display ==================== -->
    <div v-if="currentStepKey === 'display'" class="glass p-6 sm:p-8">
      <h2 class="text-xl font-semibold mb-4" style="color: var(--text-primary)">
        {{
          display === "smarttv"
            ? "Set up your smart TV"
            : "Set up your smart TV device"
        }}
      </h2>
      <div class="space-y-3 text-sm" style="color: var(--text-secondary)">
        <!-- Smart TV instructions -->
        <template v-if="display === 'smarttv'">
          <ol class="list-decimal list-inside space-y-2 ml-1">
            <li v-if="!isCloud">
              Make sure your TV is connected to the same WiFi network as your
              computer.
            </li>
            <li>
              On your TV, open the
              <strong style="color: var(--text-primary)"
                >Google Play Store</strong
              >
              (Google TV) or
              <strong style="color: var(--text-primary)"
                >Amazon Appstore</strong
              >
              (Fire TV).
            </li>
            <li>
              Search for
              <strong style="color: var(--text-primary)">TwineLine</strong> and
              install the app.
            </li>
            <li>
              Open the app.
              <template v-if="isCloud">
                Enter your server's IP address:
                <code style="color: var(--accent)">http://YOUR_SERVER_IP</code>
              </template>
              <template v-else>
                It should find your server automatically. If not, enter your
                computer's IP address.
              </template>
            </li>
            <li>You should see the TwineLine player screen on your TV.</li>
          </ol>
          <details
            v-if="!isCloud"
            class="mt-3 rounded-xl p-4"
            style="
              background: rgba(0, 0, 0, 0.2);
              border: 1px solid var(--glass-border);
            "
          >
            <summary
              class="font-medium cursor-pointer"
              style="color: var(--text-primary)"
            >
              How to find your computer's IP address
            </summary>
            <div class="mt-3 space-y-1" style="color: var(--text-secondary)">
              <p>
                <strong style="color: var(--text-primary)">Windows:</strong>
                Open a terminal and type
                <code style="color: var(--accent)">ipconfig</code>. Look for
                &ldquo;IPv4 Address&rdquo; under your WiFi adapter.
              </p>
              <p>
                <strong style="color: var(--text-primary)">macOS:</strong> Open
                System Settings &gt; Network &gt; WiFi &gt; Details &gt; IP
                Address.
              </p>
              <p>
                <strong style="color: var(--text-primary)">Linux:</strong> Run
                <code style="color: var(--accent)">hostname -I</code>.
              </p>
            </div>
          </details>
        </template>

        <!-- Smart TV device instructions -->
        <template v-if="display === 'stick'">
          <div
            class="rounded-xl p-4 mb-3"
            style="
              background: rgba(212, 160, 86, 0.1);
              border: 1px solid rgba(212, 160, 86, 0.3);
            "
          >
            <p class="font-medium mb-1" style="color: var(--accent)">
              Recommended devices
            </p>
            <p>
              <a
                href="https://www.walmart.com/ip/ONN-4K-PLUS/15557424949"
                target="_blank"
                rel="noopener"
                style="color: var(--accent)"
                class="underline"
                ><strong style="color: var(--text-primary)"
                  >onn 4K Plus</strong
                ></a
              >
              (~$30 at Walmart) &mdash; best value, works with TwineLine out of
              the box via the Google Play Store.
            </p>
            <p class="mt-1">
              <a
                href="https://www.amazon.com/Amazon-newest-AI-powered-Search-million/dp/B0F7Z4QZTT/"
                target="_blank"
                rel="noopener"
                style="color: var(--accent)"
                class="underline"
                ><strong style="color: var(--text-primary)"
                  >Fire TV Stick 4K Plus</strong
                ></a
              >
              (~$30 on Amazon) &mdash; also works well. Make sure to get the
              <strong style="color: var(--text-primary)">4K Plus</strong>, not
              the 4K Select (which runs a different operating system and is not
              compatible).
            </p>
            <p class="mt-2">
              <strong style="color: var(--text-primary)">Avoid:</strong> the onn
              4K original (model 100026240), the Fire TV Stick 4K Select (not
              compatible), and any Roku device.
            </p>
          </div>
          <ol class="list-decimal list-inside space-y-2 ml-1">
            <li>
              Plug the device into your TV's HDMI port and complete the initial
              setup.
            </li>
            <li v-if="!isCloud">
              Make sure it is connected to the same WiFi network as your
              computer.
            </li>
            <li v-else>Make sure it is connected to your WiFi network.</li>
            <li>
              Open the
              <strong style="color: var(--text-primary)"
                >Google Play Store</strong
              >
              (onn devices) or
              <strong style="color: var(--text-primary)"
                >Amazon Appstore</strong
              >
              (Fire TV).
            </li>
            <li>
              Search for
              <strong style="color: var(--text-primary)">TwineLine</strong> and
              install the app.
            </li>
            <li>
              Open the app.
              <template v-if="isCloud">
                Enter your server's IP address:
                <code style="color: var(--accent)">http://YOUR_SERVER_IP</code>
              </template>
              <template v-else>
                It should find your server automatically. If not, enter your
                computer's IP address.
              </template>
            </li>
            <li>You should see the TwineLine player screen on your TV.</li>
          </ol>
        </template>
      </div>
    </div>

    <!-- Navigation -->
    <div class="flex justify-between mt-6">
      <button v-if="currentStep > 0" class="btn-outline" @click="goBack">
        Back
      </button>
      <div v-else />

      <button
        v-if="currentStepKey === 'choose-server'"
        class="btn-accent"
        :style="!server ? 'opacity: 0.4;' : ''"
        :disabled="!server"
        @click="advance"
      >
        Continue
      </button>
      <button
        v-else-if="currentStepKey === 'choose-display'"
        class="btn-accent"
        :style="!display ? 'opacity: 0.4;' : ''"
        :disabled="!display"
        @click="advance"
      >
        Continue
      </button>
      <button v-else-if="!isLastStep" class="btn-accent" @click="advance">
        Continue
      </button>
      <button v-else class="btn-outline" @click="reset">Start over</button>
    </div>
  </div>
</template>
