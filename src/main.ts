import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';
import { zhHant } from 'vuetify/locale';
import 'vuetify/styles';
import './styles.css';
import App from './ui/App.vue';

const vuetify = createVuetify({
  icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
  locale: { locale: 'zhHant', messages: { zhHant } },
  theme: {
    defaultTheme: 'garden',
    themes: {
      garden: {
        dark: false,
        colors: {
          primary: '#2F6B4F', secondary: '#8A5B26', background: '#F7F7F2',
          surface: '#FFFFFF', 'surface-variant': '#E9EDE6', 'on-surface': '#26382E',
          'on-surface-variant': '#5B6B60', muted: '#5B6B60',
          'on-background': '#26382E', 'on-primary': '#FFFFFF', 'on-secondary': '#FFFFFF',
          'on-error': '#FFFFFF', 'on-warning': '#FFFFFF', 'on-info': '#FFFFFF', 'on-success': '#FFFFFF',
          error: '#B14D42', warning: '#90541A',
          success: '#2F6B4F', info: '#3A6A8C',
          board: '#EAF0E5', selection: '#E4F0CB',
          'warning-container': '#FFF1CD', 'error-container': '#FFE4DB',
        },
        variables: {
          'high-emphasis-opacity': 1, 'medium-emphasis-opacity': 1,
          'border-color': '#DCE2D9', 'border-opacity': 1,
        },
      },
    },
  },
  defaults: {
    VBtn: { rounded: 'lg' },
    VCard: { rounded: 'xl', elevation: 0 },
    VCardTitle: { tag: 'h2', class: 'dialog-heading ma-0' },
    VDialog: { scrollable: true },
    VSelect: { variant: 'outlined', rounded: 'lg', hideDetails: 'auto' },
  },
});

createApp(App).use(vuetify).mount('#app');
