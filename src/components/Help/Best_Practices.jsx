import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BestPractices = ({ navigation }) => {
  const [expandedSection, setExpandedSection] = useState(null);
  const insets = useSafeAreaInsets();

  const getIconForCategory = (category) => {
    switch (category) {
      case 'Buying':
        return 'cart-outline';
      case 'Safety':
        return 'shield-checkmark-outline';
      case 'Communication':
        return 'chatbubbles-outline';
      case 'Account':
        return 'lock-closed-outline';
      default:
        return 'information-circle-outline';
    }
  };

  const bestPractices = [
    {
      id: 1,
      title: 'Safe Buying Practices',
      points: [
        'Check seller ratings and reviews before buying',
        'Verify product details and images carefully',
        'Ask questions about harvest date and storage',
        'Compare prices with other listings',
        'Keep all communications within the app',
        'Document agreed price and quantity',
        'Use secure payment methods only',
        'Save all transaction details'
      ],
      category: 'Buying'
    },
    {
      id: 2,
      title: 'Communication Guidelines',
      points: [
        'Be clear about your requirements',
        'Ask about product availability',
        'Discuss delivery options beforehand',
        'Maintain professional courtesy',
        'Save important conversations',
        'Report any inappropriate behavior',
        'Respond to messages promptly'
      ],
      category: 'Communication'
    },
    {
      id: 3,
      title: 'Quality Verification',
      points: [
        'Check product images thoroughly',
        'Verify quantity matches your order',
        'Inspect for freshness on delivery',
        'Document any issues immediately',
        'Report quality problems within 24 hours',
        'Take clear photos of any issues',
        'Keep all delivery receipts',
        'Provide honest reviews'
      ],
      category: 'Safety'
    },
    {
      id: 4,
      title: 'Account Security',
      points: [
        'Enable app notifications',
        'Keep the app updated',
        'Maintain transaction records',
        'Monitor account activity',
        'Report suspicious behavior'
      ],
      category: 'Account'
    }
  ];

  const toggleSection = (id) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#43B86C" translucent />

      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <View style={styles.headerBackground}>
          <View style={styles.headerPattern} />
          <View style={styles.headerOverlay} />
        </View>

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Best Practices</Text>
            <Text style={styles.headerSubtitle}>Learn to use the app effectively</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.practicesContainer}>
          <Text style={styles.sectionTitle}>Guidelines & Tips</Text>

          {bestPractices.map((section, sectionIndex) => (
            <View
              key={section.id}
              style={[
                styles.sectionContainer,
                sectionIndex === bestPractices.length - 1 && styles.lastSection
              ]}
            >
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(section.id)}
                activeOpacity={0.7}
              >
                <View style={styles.headerLeft}>
                  <View style={styles.iconContainer}>
                    <Icon
                      name={getIconForCategory(section.category)}
                      size={22}
                      color="#8B5CF6"
                    />
                  </View>
                  <View style={styles.titleContainer}>
                    <Text style={styles.titleText}>{section.title}</Text>
                    <Text style={styles.categoryText}>{section.category}</Text>
                  </View>
                </View>

                <Icon
                  name={expandedSection === section.id ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>

              {expandedSection === section.id && (
                <View style={styles.pointsContainer}>
                  {section.points.map((point, index) => (
                    <View key={index} style={styles.pointRow}>
                      <View style={styles.bullet} />
                      <Text style={styles.pointText}>{point}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerContainer: {
    position: 'relative',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#43B86C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#43B86C',
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    opacity: 0.1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#43B86C',
    opacity: 0.95,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: 'relative',
    zIndex: 1,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  practicesContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  lastSection: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF615',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 14,
    color: '#6B7280',
  },
  pointsContainer: {
    padding: 16,
    paddingTop: 0,
    backgroundColor: '#F9FAFB',
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#43B86C',
    marginTop: 6,
    marginRight: 8,
  },
  pointText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  }
});

export default BestPractices;