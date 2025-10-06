import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

interface NavigationType {
  goBack: () => void;
}

const PrivacyOnlyScreen: React.FC = () => {
  const navigation = useNavigation<NavigationType>();
  const { t, i18n } = useTranslation();

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

  const handleBackPress = (): void => {
    navigation.goBack();
  };

  const Bullet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <View style={styles.bulletRow}>
      <Text style={styles.bullet}>{'\u2022'}</Text>
      <Text style={styles.sectionText}>{children}</Text>
    </View>
  );

  const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Text style={styles.sectionTitle}>{children}</Text>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('privacy.headerTitle')}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('privacy.title')}</Text>
          <Text style={styles.metaText}>{t('privacy.effectiveDate', { date: todayStr })}</Text>

          <Text style={styles.sectionText}>
            {t('privacy.intro')}
          </Text>

          <Heading>{t('privacy.sections.infoCollect.title')}</Heading>
          <Text style={styles.sectionText}>{t('privacy.sections.infoCollect.intro')}</Text>
          {(t('privacy.sections.infoCollect.items', { returnObjects: true }) as Array<{ term: string; desc: string }>).map((item, index) => (
            <Bullet key={index}>
              <Text><Text style={styles.bold}>{item.term}:</Text> {item.desc}</Text>
            </Bullet>
          ))}

          <Heading>{t('privacy.sections.howWeUse.title')}</Heading>
          <Text style={styles.sectionText}>{t('privacy.sections.howWeUse.intro')}</Text>
          {(t('privacy.sections.howWeUse.points', { returnObjects: true }) as string[]).map((point, index) => (
            <Bullet key={index}>{point}</Bullet>
          ))}

          <Heading>{t('privacy.sections.ourRole.title')}</Heading>
          {(t('privacy.sections.ourRole.points', { returnObjects: true }) as string[]).map((point, index) => (
            <Bullet key={index}>{point}</Bullet>
          ))}

          <Heading>{t('privacy.sections.fraudDisclaimer.title')}</Heading>
          {(t('privacy.sections.fraudDisclaimer.points', { returnObjects: true }) as string[]).map((point, index) => (
            <Bullet key={index}>{point}</Bullet>
          ))}

          <Heading>{t('privacy.sections.dataSecurity.title')}</Heading>
          {(t('privacy.sections.dataSecurity.points', { returnObjects: true }) as string[]).map((point, index) => (
            <Bullet key={index}>{point}</Bullet>
          ))}

          <Heading>{t('privacy.sections.dataRetention.title')}</Heading>
          {(t('privacy.sections.dataRetention.points', { returnObjects: true }) as string[]).map((point, index) => (
            <Bullet key={index}>{point}</Bullet>
          ))}

          <Heading>{t('privacy.sections.jurisdiction.title')}</Heading>
          {(t('privacy.sections.jurisdiction.points', { returnObjects: true }) as string[]).map((point, index) => (
            <Bullet key={index}>{point}</Bullet>
          ))}

          <Heading>{t('privacy.sections.changes.title')}</Heading>
          {(t('privacy.sections.changes.points', { returnObjects: true }) as string[]).map((point, index) => (
            <Bullet key={index}>{point}</Bullet>
          ))}

          <Heading>{t('privacy.sections.contact.title')}</Heading>
          <Text style={styles.sectionText}>{t('privacy.sections.contact.text')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 10, paddingTop: (StatusBar.currentHeight ?? 0) + 16, paddingVertical: 12,
    backgroundColor: '#F5F5F5'
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  headerRight: { width: 40 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#000', marginBottom: 6 },
  metaText: { fontSize: 12, color: '#666', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#000', marginTop: 16, marginBottom: 8 },
  sectionText: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 8 },
  bold: { fontWeight: '600', color: '#000' },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bullet: { fontSize: 14, color: '#666', lineHeight: 20, marginTop: 2 },
});

export default PrivacyOnlyScreen;
