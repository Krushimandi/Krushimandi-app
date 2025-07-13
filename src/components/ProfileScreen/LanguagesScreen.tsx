import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const availableLanguages = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'mr', name: 'Marathi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'kn', name: 'Kannada' },
];

const LanguagesScreen = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const renderItem = ({ item }: { item: { code: string; name: string } }) => (
    <TouchableOpacity
      style={[
        styles.languageOption,
        item.code === selectedLanguage && styles.selectedOption,
      ]}
      onPress={() => setSelectedLanguage(item.code)}
    >
      <Text
        style={[
          styles.languageText,
          item.code === selectedLanguage && styles.selectedText,
        ]}
      >
        {item.name}
      </Text>
      {item.code === selectedLanguage && (
        <Ionicons name="checkmark-circle" size={22} color="#2E7D32" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Choose Language</Text>
      <FlatList
        data={availableLanguages}
        keyExtractor={(item) => item.code}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

export default LanguagesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 26,
    marginTop:26,
    color: '#000',
  },
  list: {
    paddingBottom: 20,
  },
  languageOption: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // elevation: 2,
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
});
