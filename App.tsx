import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  BackHandler, 
  Linking, 
  Platform, 
  StyleSheet, 
  Alert, 
  NativeModules
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OneSignal } from 'react-native-onesignal';
import CookieManager from '@react-native-cookies/cookies';
import i18n from './i18n';

const BASE_URL = 'https://podyumplus.com';
const ONESIGNAL_APP_ID = '2be5d1bc-7fcd-4b85-9724-589db662bcd5';
const WHATSAPP_PHONE = '908503468976';
const WHATSAPP_MESSAGE = "Merhaba,\nwww.podyumplus.com'dan sipariş vermek istiyorum.";

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(`${BASE_URL}?app=1&onesignal_id=0`);
  const [oneSignalId, setOneSignalId] = useState<string>('0');

  // OneSignal ID'sini al ve cookie'yi ayarla
  const initializeOneSignal = useCallback(async () => {
    try {
      OneSignal.initialize(ONESIGNAL_APP_ID);
      
      // Default cookie'yi hemen ayarla
      await CookieManager.set(BASE_URL, {
        name: 'onesignal_id',
        value: '0',
        domain: 'podyumplus.com',
        path: '/',
        version: '0',
        expires: '2030-12-31T23:59:59.00Z',
      });
      
      await CookieManager.set(BASE_URL, {
        name: 'app',
        value: '1',
        domain: 'podyumplus.com',
        path: '/',
        version: '0',
        expires: '2030-12-31T23:59:59.00Z',
      });

      await CookieManager.set(BASE_URL, {
        name: 'closePremium',
        value: '1',
        domain: 'podyumplus.com',
        path: '/',
        version: '0',
        expires: '2030-12-31T23:59:59.00Z',
      });

      // OneSignal ID'sini arka planda al
      const id = await OneSignal.User.getOnesignalId();
      const finalId = id || '0';
      
      setOneSignalId(finalId);
      
      // Cookie'yi gerçek ID ile güncelle
      await CookieManager.set(BASE_URL, {
        name: 'onesignal_id',
        value: finalId,
        domain: 'podyumplus.com',
        path: '/',
        version: '0',
        expires: '2030-12-31T23:59:59.00Z',
      });

// Bildirim tıklama handler'ını ekle
      OneSignal.Notifications.addEventListener('click', (event: any) => {
        console.log('OneSignal notification clicked:', event);
        
        // Bildirim verilerini kontrol et
        const notification = event.notification;
        const additionalData: Record<string, any> = notification?.additionalData || {};
        
        // Custom URL'yi kontrol et
        if (additionalData.customURL && typeof additionalData.customURL === 'string') {
          const customUrl: string = additionalData.customURL;
          console.log('Custom URL found:', customUrl);
          
          // URL'yi parametrelerle birlikte oluştur
          const urlWithParams = buildUrl(customUrl, finalId);
          
          // WebView'a yönlendir
          setCurrentUrl(urlWithParams);
        } else if (notification?.launchURL && typeof notification?.launchURL === 'string') {
          // Alternatif olarak 'url' key'ini kontrol et
          const customUrl: string = notification?.launchURL;
          console.log('Launch URL found:', customUrl);
          
          const urlWithParams = buildUrl(customUrl, finalId);
          setCurrentUrl(urlWithParams);
        }
      });

    } catch (error) {
      console.error('OneSignal initialization error:', error);
      setOneSignalId('0');
    }
  }, []);

  // URL builder fonksiyonu
  const buildUrl = useCallback((baseUrl: string, onesignalId: string): string => {
    try {
      const url = new URL(baseUrl);
      url.searchParams.set('app', '1');
      url.searchParams.set('onesignal_id', onesignalId);
      return url.toString();
    } catch {
      // fallback
      return baseUrl.includes('?')
        ? `${baseUrl}&app=1&onesignal_id=${onesignalId}`
        : `${baseUrl}?app=1&onesignal_id=${onesignalId}`;
    }
  }, []);

  // Deep link handler
  const handleDeepLink = useCallback((url: string) => {
    const urlWithParams = buildUrl(url, oneSignalId);
    setCurrentUrl(urlWithParams);
  }, [oneSignalId, buildUrl]);

  // Back button handler
  const handleBackPress = useCallback(() => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
      return true;
    }
    return false;
  }, [canGoBack]);

  // WhatsApp handler - URL'den telefon numarası ve mesajı alır
  const handleWhatsAppLink = useCallback(async (url: string) => {
    try {
      // URL'yi manuel olarak parse et
      const queryStart = url.indexOf('?');
      if (queryStart === -1) {
        console.warn('WhatsApp link has no query parameters');
        return;
      }
      
      const queryString = url.substring(queryStart + 1);
      const params = new Map<string, string>();
      
      // Query parametrelerini parse et
      queryString.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key && value) {
          params.set(key, value);
        }
      });
      
      // Phone ve text parametrelerini al
      const phone = params.get('phone');
      const text = params.get('text');
      
      // Parametreler yoksa işlem yapma
      if (!phone || !text) {
        console.warn('WhatsApp link missing required parameters (phone or text)');
        return;
      }
      
      // Telefon numarasındaki + işaretini kaldır (WhatsApp app link için)
      const cleanPhone = decodeURIComponent(phone).replace(/^\+/, '');
      
      // Mesajı decode et
      const decodedText = decodeURIComponent(text);
      
      // WhatsApp app link'i oluştur
      const whatsappURL = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(decodedText)}`;
      
      // WhatsApp app'in yüklü olup olmadığını kontrol et
      const supported = await Linking.canOpenURL(whatsappURL);
      
      if (supported) {
        // WhatsApp app'i aç
        await Linking.openURL(whatsappURL);
      } else {
        // WhatsApp app yüklü değilse web versiyonunu aç
        await Linking.openURL(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(decodedText)}`);
      }
    } catch (error) {
      console.error('WhatsApp link error:', error);
    }
  }, []);

  // WebView message handler
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const messageData = JSON.parse(event.nativeEvent.data);
      if (messageData.type === 'fromWebForNotificationPermission') {
        showNotificationPermissionDialog();
      }
    } catch (error) {
      console.error('Message parsing error:', error);
    }
  }, []);

  // Navigation state handler
  const handleNavigationStateChange = useCallback((navState: any) => {
    setCanGoBack(navState.canGoBack);
  }, []);

  // Should start load handler
  const handleShouldStartLoadWithRequest = useCallback((event: any): boolean => {
    const url = event.url;

    // WhatsApp link kontrolü
    if (url.includes('wa.me') || url.includes('api.whatsapp.com')) {
      handleWhatsAppLink(url);
      return false;
    }

    return true;
  }, [handleWhatsAppLink]);

  // Load end handler
  const handleLoadEnd = useCallback(async () => {
    setIsLoading(false);
    
    // WebView yüklendiğini işaretle
    if (Platform.OS === 'android') {
      try {
        // SharedPreferences yaklaşımı için
        await AsyncStorage.setItem('webview_ready', 'true');
        
        // Native event yaklaşımı için
        const { DeviceEventManagerModule } = NativeModules;
        if (DeviceEventManagerModule) {
          DeviceEventManagerModule.emit('webViewLoaded', null);
        }
      } catch (error) {
        console.log('WebView ready signal failed:', error);
      }
    }
  }, []);

  // Notification permission dialog
  const showNotificationPermissionDialog = useCallback(() => {
    Alert.alert(
      i18n.t('notif_title'),
      i18n.t('notif_message'),
      [
        {
          text: i18n.t('notif_deny'),
          style: 'cancel',
        },
        {
          text: i18n.t('notif_allow'),
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, []);

  // OneSignal initialization effect
  useEffect(() => {
    initializeOneSignal();
  }, [initializeOneSignal]);

  // Back handler effect
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [handleBackPress]);

  // Deep link handling effect
  useEffect(() => {
    // Initial URL check
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Listen for new URLs
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => subscription.remove();
  }, [handleDeepLink]);

  // OneSignal ID değiştiğinde URL'yi güncelle
  useEffect(() => {
    if (oneSignalId !== '0') {
      const newUrl = buildUrl(BASE_URL, oneSignalId);
      setCurrentUrl(newUrl);
    }
  }, [oneSignalId, buildUrl]);

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: currentUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onMessage={handleMessage}
        onLoadEnd={handleLoadEnd}
        originWhitelist={['*']}
        thirdPartyCookiesEnabled={true}
        cacheEnabled={true}
        cacheMode="LOAD_CACHE_ELSE_NETWORK"
        startInLoadingState={true}
        mixedContentMode="compatibility"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        scalesPageToFit={false}
        bounces={false}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        incognito={false}
        domStorageEnabled={true}
        javaScriptEnabled={true}
        allowsBackForwardNavigationGestures={true}
        pullToRefreshEnabled={true}
        sharedCookiesEnabled={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  }
});