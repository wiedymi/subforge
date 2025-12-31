import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: 'docs',

  title: 'Subforge',
  description: 'High-performance subtitle parsing, serialization, and conversion',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'Formats', link: '/formats' },
      { text: 'Performance', link: '/performance' },
      { text: 'Browser', link: '/browser' }
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Document Model', link: '/document-model' },
          { text: 'Parsing', link: '/parsing' },
          { text: 'Serialization', link: '/serialization' },
          { text: 'Conversion', link: '/conversion' },
          { text: 'Errors', link: '/errors' }
        ]
      },
      {
        text: 'API',
        items: [
          { text: 'Operations', link: '/operations' },
          { text: 'Formats', link: '/formats' }
        ]
      },
      {
        text: 'Runtime',
        items: [
          { text: 'Browser Usage', link: '/browser' },
          { text: 'Performance', link: '/performance' }
        ]
      }
    ]
  }
})
