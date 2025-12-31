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
      { text: 'Matrix', link: '/format-support' },
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
          { text: 'Formats Overview', link: '/formats' },
          { text: 'Format Support Matrix', link: '/format-support' }
        ]
      },
      {
        text: 'Formats',
        items: [
          { text: 'ASS', link: '/formats/ass' },
          { text: 'SSA', link: '/formats/ssa' },
          { text: 'SRT', link: '/formats/srt' },
          { text: 'VTT', link: '/formats/vtt' },
          { text: 'SBV', link: '/formats/sbv' },
          { text: 'LRC', link: '/formats/lrc' },
          { text: 'MicroDVD', link: '/formats/microdvd' },
          { text: 'TTML', link: '/formats/ttml' },
          { text: 'SAMI', link: '/formats/sami' },
          { text: 'RealText', link: '/formats/realtext' },
          { text: 'QuickTime Text', link: '/formats/qt' },
          { text: 'STL (EBU/Spruce)', link: '/formats/stl' },
          { text: 'PGS', link: '/formats/pgs' },
          { text: 'DVB', link: '/formats/dvb' },
          { text: 'VobSub', link: '/formats/vobsub' },
          { text: 'PAC', link: '/formats/pac' },
          { text: 'SCC', link: '/formats/scc' },
          { text: 'CAP', link: '/formats/cap' },
          { text: 'Teletext', link: '/formats/teletext' }
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
