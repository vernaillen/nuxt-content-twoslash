import { defineConfig } from '@nuxtjs/mdc/config'
import type { ShikiTransformer } from 'shiki'

export default defineConfig({
  shiki: {
    async setup(shiki) {
      // Ensure necessary languages are loaded
      await shiki.loadLanguage(
        import('shiki/langs/javascript.mjs'),
        import('shiki/langs/typescript.mjs'),
        import('shiki/langs/vue.mjs'),
      )
    },
    transformers: async (_code, _lang, _theme, options): Promise<ShikiTransformer[]> => {
      if (typeof options.meta !== 'string' || !options.meta?.match(/\btwoslash\b/))
        return []

      // We only runs TwoSlash at build time
      // As Nuxt Content cache the result automatically, we don't need to ship twoslash in any production bundle
      if (import.meta.server && (import.meta.prerender || import.meta.dev)) {
        const {
          typeDecorations,
          moduleOptions,
        } = await import('#twoslash-meta')

        const prepend = [
          '/// <reference types="./.nuxt/nuxt.d.ts" />',
          '',
        ].join('\n')

        const { transformerTwoslash, rendererFloatingVue } = await import('@shikijs/vitepress-twoslash')
        return [
          transformerTwoslash({
            throws: false,
            renderer: rendererFloatingVue({
              floatingVue: moduleOptions.floatingVueOptions,
            }),
            twoslashOptions: {
              extraFiles: moduleOptions.includeNuxtTypes
                ? {
                    ...typeDecorations,
                    'index.ts': { prepend },
                    'index.tsx': { prepend },
                  }
                : undefined,
              compilerOptions: {
                lib: ['esnext', 'dom'],
                ...moduleOptions.compilerOptions,
              },
              handbookOptions: moduleOptions.handbookOptions,
            },
          }),
        ]
      }
      // Fallback to remove twoslash notations
      else {
        const { removeTwoslashNotations } = await import('twoslash/fallback')
        return [
          {
            name: 'twoslash:fallback',
            preprocess(code) {
              return removeTwoslashNotations(code)
            },
          },
        ]
      }
    },
  },
})
