import React from 'react';
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

const PaymentSecurity = ({ navigation }) => {
  const getIconForCategory = (category) => {
    switch (category) {
      case 'Payment':
        return 'wallet-outline';
      case 'Security':
        return 'shield-checkmark-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const securityFaq = [
    {
      title: 'How does payment work?',
      content: 'Payment process:\n\nThe payment process is handled between buyer and farmer once the order is accepted. Use secure payment methods and confirm details through the app chat. Always verify the transaction before completing payment.\n\nNote: We do not handle payments directly.',
      image: require('../../assets/help_center/payment.png'),
      category: 'Security',
    },
    {
      title: 'Are my private details safe?',
      content: 'Your security:\n\n1) All data is encrypted\n2) No unauthorized user can access your information\n3) Private chat system\n4) Limited contact sharing\n5) Regular security updates',
      image: require('../../assets/help_center/security.jpg'),
      category: 'Security',
    },
    {
      title: 'Recommended safe practices',
      content: 'For safe transactions:\n\n1) Always communicate within the app\n2) Verify farmer details before payment\n3) Use secure payment methods\n4) Do not share sensitive information outside the app\n5) Keep records of your orders and chats',
      image: require('../../assets/help_center/security.jpg'),
      category: 'Security',
    },
    {
      title: 'What to do if a deal fails?',
      content: 'If a deal fails:\n\n1) Contact the farmer to clarify the issue\n2) Do not make payment until the deal is confirmed\n3) Cancel the order in the app if needed\n4) Seek alternative sellers using the app\n5) Report the issue to support if necessary',
      image: require('../../assets/help_center/security.jpg'),
      category: 'Security',
    },
    {
      title: 'How to report fraud or disputes?',
      content: 'To report fraud or disputes:\n\n1) Go to Help Center page\n2) Contact the Support Team using the given phone number,\n3) Provide details and evidence (screenshots, chat logs)\n4) Our team will review and assist you\n5) Follow up as needed for resolution',
      image: require('../../assets/help_center/security.jpg'),
      category: 'Security',
    },
  ];


  const handleFaqPress = (item) => {
    navigation.navigate('FaqDetail', {
      title: item.title,
      content: item.content,
      image: item.image,
      category: item.category,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#43B86C" translucent />

      <View style={styles.headerContainer}>
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
            <Text style={styles.headerTitle}>Trust and safety</Text>
            <Text style={styles.headerSubtitle}>Learn about secure transactions</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.faqContainer}>
          <Text style={styles.sectionTitle}>Payment & Security FAQ</Text>
          
          <View style={styles.faqItems}>
            {securityFaq.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.faqItem,
                  index === securityFaq.length - 1 && styles.lastItem
                ]}
                activeOpacity={0.7}
                onPress={() => handleFaqPress(item)}
              >
                <View style={styles.faqLeft}>
                  <View style={styles.faqIconContainer}>
                    <Icon
                      name={getIconForCategory(item.category)}
                      size={22}
                      color="#DC2626"
                    />
                  </View>

                  <View style={styles.faqInfo}>
                    <Text style={styles.faqTitle}>{item.title}</Text>
                    <Text style={styles.faqCategory}>{item.category}</Text>
                  </View>
                </View>

                <View style={styles.chevronContainer}>
                  <Icon name="chevron-forward" size={18} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
    paddingTop: StatusBar.currentHeight || 44,
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
    paddingVertical: 20,
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
    top: 20,
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
    paddingTop: 20,
    paddingBottom: 40,
  },
  faqContainer: {
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  faqItems: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#43B86C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.05)',
  },
  faqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  faqLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  faqIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    backgroundColor: '#DC262615',
  },
  faqInfo: {
    flex: 1,
  },
  faqTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  faqCategory: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 16,
  },
  chevronContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PaymentSecurity;