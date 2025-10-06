import React, { useMemo, useState } from 'react';
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
import { useTranslation } from 'react-i18next';

interface NavigationType {
  goBack: () => void;
}

const TermsConditionScreen: React.FC = () => {
  const navigation = useNavigation<NavigationType>();
  const { t, i18n } = useTranslation();
  const [expandedSections, setExpandedSections] = useState<{ [key: number]: boolean }>({});

  // Build Terms & Conditions sections from i18n translations
  const sectionKeys = useMemo(
    () => [
      'definitions',
      'msme',
      'roleDisclaimer',
      'userResponsibilities',
      'paymentFraud',
      'ownershipIP',
      'prohibitedActivities',
      'riskAcknowledgment',
      'legalCompliance',
      'termination',
      'amendments',
      'limitation',
      'acknowledgment',
    ] as const,
    []
  );

  const formatDate = (d: Date) => {
    try {
      return new Intl.DateTimeFormat(i18n.language || 'en', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(d);
    } catch {
      return d.toDateString();
    }
  };

  const todayStr = useMemo(() => formatDate(new Date()), [i18n.language]);

  const toggleSection = (index: number): void => {
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleBackPress = (): void => {
    navigation.goBack();
  };

  const PolicySectionComponent: React.FC<{ index: number; sectionKey: (typeof sectionKeys)[number] }> = ({ index, sectionKey }) => {
    const title = t(`terms.sections.${sectionKey}.title`);
    const items = t(`terms.sections.${sectionKey}.items`, { returnObjects: true }) as any[] | string;
    const points = t(`terms.sections.${sectionKey}.points`, { returnObjects: true }) as string[] | string;
    const riskTitle = t(`terms.sections.${sectionKey}.riskAdvisoryTitle`, { defaultValue: '' });
    const riskPoints = t(`terms.sections.${sectionKey}.riskPoints`, { returnObjects: true, defaultValue: [] as any }) as string[];

    const isExpanded = !!expandedSections[index];

    // Prepare preview: first 2 bullets; full: all bullets
    const renderBullets = (all: Array<any>, max?: number) => {
      const arr = Array.isArray(all) ? all : [];
      const display = typeof max === 'number' ? arr.slice(0, max) : arr;
      return display.map((it, i) => {
        if (it && typeof it === 'object' && 'term' in it) {
          return (
            <View style={styles.bulletRow} key={`i-${i}`}>
              <Text style={styles.bullet}>{'\u2022'}</Text>
              <Text style={styles.sectionText}><Text style={styles.bold}>{it.term}: </Text>{it.desc}</Text>
            </View>
          );
        }
        return (
          <View style={styles.bulletRow} key={`p-${i}`}>
            <Text style={styles.bullet}>{'\u2022'}</Text>
            <Text style={styles.sectionText}>{String(it)}</Text>
          </View>
        );
      });
    };

    const itemsArr = Array.isArray(items) ? (items as any[]) : [];
    const pointsArr = Array.isArray(points) ? (points as any[]) : [];
    const riskPointsArr = Array.isArray(riskPoints) ? riskPoints : [];

    const hasItems = itemsArr.length > 0;
    const hasPoints = pointsArr.length > 0;
    const hasRisk = !!riskTitle && riskPointsArr.length > 0;

    const showReadMore = (itemsArr.length > 2) || (pointsArr.length > 2) || (hasRisk && riskPointsArr.length > 2);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {hasItems && (isExpanded ? renderBullets(itemsArr) : renderBullets(itemsArr, 2))}
        {hasPoints && (isExpanded ? renderBullets(pointsArr) : renderBullets(pointsArr, 2))}

        {!!riskTitle && (
          <Text style={styles.subheading}>{riskTitle}</Text>
        )}
        {!!riskTitle && (hasRisk && (isExpanded ? renderBullets(riskPointsArr) : renderBullets(riskPointsArr, 2)))}

        {showReadMore && (
          <TouchableOpacity style={styles.readMoreButton} onPress={() => toggleSection(index)}>
            <Text style={styles.readMoreText}>
              {isExpanded ? 'Read Less' : 'Read More'}
            </Text>
          </TouchableOpacity>
        )}

        {index < sectionKeys.length - 1 && <View style={styles.separator} />}
      </View>
    );
  };

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
        <Text style={styles.headerTitle}>{t('terms.headerTitle')}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {/* Effective / Last Updated */}
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{t('terms.effectiveDateLabel', { date: todayStr })}</Text>
            <Text style={styles.metaText}>{t('terms.lastUpdatedLabel', { date: todayStr })}</Text>
          </View>

          {/* Intro */}
          <Text style={styles.sectionText}>{t('terms.intro')}</Text>

          {sectionKeys.map((key, index) => (
            <PolicySectionComponent key={key} sectionKey={key} index={index} />
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
  metaRow: {
    marginBottom: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
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
  subheading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginTop: 8,
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '600',
    color: '#000',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 2,
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

export default TermsConditionScreen;