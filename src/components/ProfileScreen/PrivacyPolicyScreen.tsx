import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface NavigationType {
  goBack: () => void;
}

interface PolicySection {
  title: string;
  preview: string;
  fullContent: string;
}

const PrivacyPolicyScreen: React.FC = () => {
  const navigation = useNavigation<NavigationType>();
  const [expandedSections, setExpandedSections] = useState<{ [key: number]: boolean }>({});

  const policySections: PolicySection[] = [
    {
      title: "Terms and Conditions",
      preview: "Welcome to our DLC Generation App! By accessing or using our app, you agree to comply with and be bound by the following terms and conditions of use. Please read these terms carefully before using our app.\n\nAcceptance of Terms: By using the DLC Generation App, you agree to these Terms and Conditions and Privacy Policy. If you do not agree, please do not use this app.",
      fullContent: "Welcome to our DLC Generation App! By accessing or using our app, you agree to comply with and be bound by the following terms and conditions of use. Please read these terms carefully before using our app.\n\nAcceptance of Terms: By using the DLC Generation App, you agree to these Terms and Conditions and Privacy Policy. If you do not agree, please do not use this app.\n\nUse of the App: You may use our app for lawful purposes only. You agree not to use the app in any way that could damage, disable, overburden, or impair the app or interfere with any other party's use of the app.\n\nUser Accounts: You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account.\n\nIntellectual Property: All content, features, and functionality of the app are owned by us and are protected by copyright, trademark, and other intellectual property laws."
    },
    {
      title: "Privacy Policy",
      preview: "Protecting your privacy is important to us. This Privacy Policy outlines how we collect, use, and protect your personal information when you use our DLC Generation App.\n\nInformation We Collect: We may collect personal information such as your name, email address, and device information when you use our app.",
      fullContent: "Protecting your privacy is important to us. This Privacy Policy outlines how we collect, use, and protect your personal information when you use our DLC Generation App.\n\nInformation We Collect: We may collect personal information such as your name, email address, and device information when you use our app.\n\nHow We Use Your Information: We use your information to provide and improve our services, communicate with you, and ensure the security of our app.\n\nData Security: We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.\n\nThird-Party Services: We may use third-party services to help us operate our app. These services have their own privacy policies.\n\nChanges to This Policy: We may update this Privacy Policy from time to time. We will notify you of any significant changes."
    }
  ];

  const toggleSection = (index: number): void => {
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleBackPress = (): void => {
    navigation.goBack();
  };

  const PolicySectionComponent: React.FC<{ section: PolicySection; index: number }> = ({
    section,
    index
  }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionText}>
        {expandedSections[index] ? section.fullContent : section.preview}
      </Text>
      <TouchableOpacity
        style={styles.readMoreButton}
        onPress={() => toggleSection(index)}
      >
        <Text style={styles.readMoreText}>
          {expandedSections[index] ? 'Read Less' : 'Read More'}
        </Text>
      </TouchableOpacity>
      {index < policySections.length - 1 && <View style={styles.separator} />}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>T&C | Privacy Policy</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {policySections.map((section: PolicySection, index: number) => (
            <PolicySectionComponent
              key={index}
              section={section}
              index={index}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

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
    paddingTop: (StatusBar.currentHeight ?? 0) + 16,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  sectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  readMoreButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  readMoreText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 24,
  },
});

export default PrivacyPolicyScreen;