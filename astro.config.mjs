// @ts-check
import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://twineline.ai',

  // Starlight is REMOVED on this branch, not merely unlinked. It owned live
  // routes of its own -- /introduction and /quickstart were serving on
  // production -- documenting the self-host installer. Deleting the pages
  // while leaving the integration would have left that documentation up
  // behind the holding page. `preview` keeps it.
  integrations: [vue()],

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: cloudflare(),
});
