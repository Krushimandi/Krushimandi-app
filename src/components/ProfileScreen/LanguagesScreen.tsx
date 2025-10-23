import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NavigationProp {
  goBack: () => void;
}

interface LanguagesScreenProps {
  navigation?: NavigationProp;
}

type LanguageItem = { code: string; name: string; enabled: boolean };

// Only enable English (en), Hindi (hi), and Marathi (mr) for now
const availableLanguages: LanguageItem[] = [
  { code: 'en', name: 'English', enabled: true },
  { code: 'hi', name: 'Hindi', enabled: true },
  { code: 'mr', name: 'Marathi', enabled: true },
  { code: 'bn', name: 'Bengali', enabled: false },
  { code: 'ta', name: 'Tamil', enabled: false },
  { code: 'te', name: 'Telugu', enabled: false },
  { code: 'gu', name: 'Gujarati', enabled: false },
  { code: 'kn', name: 'Kannada', enabled: false },
];

// Persisted storage key for selected language
const LANGUAGE_STORAGE_KEY = 'app.selectedLanguage';
const ENABLED_LANGUAGE_CODES = availableLanguages
  .filter(l => l.enabled)
  .map(l => l.code);

const LanguagesScreen: React.FC<LanguagesScreenProps> = ({ navigation }) => {
  const { t, i18n: i18nInstance } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [refreshKey, setRefreshKey] = useState(0);
  const insets = useSafeAreaInsets();

  // Load saved language on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved && ENABLED_LANGUAGE_CODES.includes(saved)) {
          if (isMounted) setSelectedLanguage(saved);
        }
      } catch (e) {
        // Keep warnings/errors per project policy; ignore otherwise
        console.warn?.('Failed to load saved language');
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Save language whenever it changes
  useEffect(() => {
    (async () => {
      try {
        if (ENABLED_LANGUAGE_CODES.includes(selectedLanguage)) {
          await AsyncStorage.setItem(
            LANGUAGE_STORAGE_KEY,
            selectedLanguage,
          );
        }
      } catch (e) {
        console.warn?.('Failed to save selected language');
      }
    })();
  }, [selectedLanguage]);

  // Listen for language changes from i18n and force re-render
  useEffect(() => {
    const handleLanguageChanged = () => {
      setRefreshKey(prev => prev + 1);
    };

    i18nInstance.on('languageChanged', handleLanguageChanged);

    return () => {
      i18nInstance.off('languageChanged', handleLanguageChanged);
    };
  }, [i18nInstance]);

  const handleBackPress = (): void => {
    if (navigation) {
      navigation.goBack();
    }
  };

  const renderItem = ({ item }: { item: LanguageItem }) => {
    const isSelected = item.code === selectedLanguage && item.enabled;
    const isDisabled = !item.enabled;

    return (
      <TouchableOpacity
        activeOpacity={isDisabled ? 1 : 0.7}
        disabled={isDisabled}
        style={[
          styles.languageOption,
          isSelected && styles.selectedOption,
        ]}
        onPress={async () => {
          if (!item.enabled) return;
          setSelectedLanguage(item.code);
          try {
            await i18n.changeLanguage(item.code);
            // Force component re-render to pick up new translations
            setRefreshKey(prev => prev + 1);
          } catch (error) {
            console.warn('Failed to change language:', error);
          }
        }}
      >
        <Text
          style={[
            styles.languageText,
            isSelected && styles.selectedText,
            isDisabled && styles.disabledText,
          ]}
        >
          {t(`language.${item.code}`, { defaultValue: item.name })}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={22} color="#2E7D32" />
        )}
        {isDisabled && (
          <View style={styles.disabledBadge}>
            <Text style={styles.disabledBadgeText}>{t('labels.unavailable')}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('labels.chooseLanguage')}</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        <FlatList
          key={refreshKey}
          data={availableLanguages}
          keyExtractor={(item) => item.code}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      </View>

      {/* Bottom indicator */}
      <View style={styles.bottomIndicator} />
    </SafeAreaView>
  );
};

export default LanguagesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 26,
    marginTop: 26,
    color: '#000',
    paddingHorizontal: 20,
  },
  list: {
    paddingBottom: 20,
    paddingHorizontal: 4,
  },
  languageOption: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  languageText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOption: {
    borderColor: '#2E7D32',
    borderWidth: 1.2,
  },
  selectedText: {
    fontWeight: '600',
    color: '#2E7D32',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  disabledBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  disabledBadgeText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
  },
  bottomIndicator: {
    width: 134,
    height: 5,
    backgroundColor: '#000',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 8,
  },
});
