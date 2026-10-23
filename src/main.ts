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
          primary: '#2F6B4F', secondary: '#C17745', background: '#F7F7F2',
          surface: '#FFFFFF', 'surface-variant': '#E9EDE6', 'on-surface': '#26382E',
          'on-surface-variant': '#435540',
          'on-background': '#26382E', error: '#B14D42', warning: '#A96419',
          success: '#2F6B4F', info: '#3A6A8C',
        },
      },
    },
  },
  defaults: {
    VBtn: { rounded: 'lg', style: 'text-transform: none; letter-spacing: 0' },
    VCard: { rounded: 'xl', elevation: 0 },
    VDialog: { scrollable: true },
    VSelect: { variant: 'outlined', rounded: 'lg', hideDetails: 'auto' },
  },
});

createApp(App).use(vuetify).mount('#app');
