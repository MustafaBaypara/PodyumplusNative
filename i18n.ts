import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';

const resources = {
  en: {
    translation: {
      notif_title: 'Enable Notifications',
      notif_message: 'Would you like to allow notifications for new products and campaigns?',
      notif_allow: 'Allow',
      notif_deny: 'No',
    },
  },
  tr: {
    translation: {
      notif_title: 'Bildirimlere İzin Ver',
      notif_message: 'Yeni ürün ve kampanyalardan haberdar olmak için bildirim izni vermek ister misiniz?',
      notif_allow: 'İzin Ver',
      notif_deny: 'Hayır',
    },
  },
  ar: {
    translation: {
      notif_title: 'السماح بالإشعارات',
      notif_message: 'هل ترغب في تلقي إشعارات حول المنتجات والعروض الجديدة؟',
      notif_allow: 'نعم',
      notif_deny: 'لا',
    },
  },
};

// Kullanıcının dil tercihini al
const fallbackLng = 'en';
const locales = RNLocalize.getLocales();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: locales[0]?.languageCode || fallbackLng,
    fallbackLng,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
