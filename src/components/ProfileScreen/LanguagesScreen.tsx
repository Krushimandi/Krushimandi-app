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

const LanguagesScreen = () => {
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState('en');

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
        onPress={() => {
          if (!item.enabled) return;
          setSelectedLanguage(item.code);
          try { i18n.changeLanguage(item.code); } catch { }
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <Text style={styles.heading}>{t('labels.chooseLanguage')}</Text>
        <FlatList
          data={availableLanguages}
          keyExtractor={(item) => item.code}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      </View>
    </SafeAreaView>
  );
};

export default LanguagesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 20,
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
    paddingHorizontal: 20,
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
});
