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

const AppPlatform = ({ route, navigation }) => {

  // Function to get appropriate icon based on category
  const getIconForCategory = (category) => {
    switch (category) {
      case 'Navigation':
        return 'navigate-circle-outline';
      case 'Settings':
        return 'settings-outline';
      case 'Search':
        return 'search-outline';
      case 'Feedback':
        return 'chatbubble-outline';
      default:
        return 'help-circle-outline';
    }
  };

  // Add a 'category' field to each FAQ
  const platformFaq = [
    {
      title: 'How to track my active and past listings?',
      content:
        'To track your active and past listings, go to the "Listings" section in your profile. Active listings will appear at the top, and past listings can be found under the "History" tab.',
      image: require('../../assets/help_center/list.jpg'),
      category: 'Navigation',
    },
    {
      title: 'How to set or change the price of an item?',
      content:
        'To set or change the price of an item, go to your active listings, select the item, and tap on "Edit Price." Enter the new price and save the changes.',
      image: require('../../assets/help_center/update.jpg'),
      category: 'Settings',
    },
    {
      title: 'How to mark an item as sold/unavailable?',
      content:
        'To mark an item as sold or unavailable, go to your active listings, select the item, and tap on "Mark as Sold" or "Mark as Unavailable."',
      image: require('../../assets/help_center/mark-sold.jpg'),
      category: 'Settings',
    },

    {
      title: 'How to enable or disable app notifications?',
      content:
        'To enable or disable app notifications, go to the "Settings" section, tap on "Notifications," and toggle the switch to your preference.',
      image: require('../../assets/help_center/notification_settings.jpg'),
      category: 'Settings',
    },
  ];


  const faqList = platformFaq;
  const faqTitle = "App & Platform Use FAQ";

  // Get unique categories for the button(s)
  const categories = Array.from(new Set(faqList.map(faq => faq.category)));

  // Navigate to FAQ detail page
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
      <StatusBar
        barStyle="light-content"
        backgroundColor="#43B86C"
        translucent />

      {/* Header with same styling as HelpScreen */}
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
            <Text style={styles.headerTitle}>FAQ Section</Text>
            <Text style={styles.headerSubtitle}>Find answers to common questions</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* FAQ Section */}
        <View style={styles.faqContainer}>
          <Text style={styles.sectionTitle}>{faqTitle}</Text>

          <View style={styles.faqItems}>
            {faqList.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.faqItem,
                  index === faqList.length - 1 && styles.lastItem
                ]}
                activeOpacity={0.7}
                onPress={() => handleFaqPress(item)}
              >
                <View style={styles.faqLeft}>
                  <View style={styles.faqIconContainer}>
                    <Icon
                      name={getIconForCategory(item.category)}
                      size={22}
                      color="#F59E0B"
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
    backgroundColor: '#F59E0B15',
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

export default AppPlatform;