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

const HelpGuideScreen = ({ route, navigation }) => {
  const { userType } = route.params;

  // Function to get appropriate icon based on category
  const getIconForCategory = (category) => {
    switch (category) {
      case 'List an Item':
        return 'add-circle-outline';
      case 'Delete a listed Item':
        return 'trash-outline';
      case 'Profile':
        return 'person-circle-outline';
      case 'Manage listed Item':
        return 'settings-outline';
      case 'Buy an Item':
      case 'Buy an Item ':
        return 'bag-outline';
      case 'Go to search':
        return 'search-outline';
      case 'Manage your orders':
        return 'clipboard-outline';
      default:
        return 'help-circle-outline';
    }
  };

  // Add a 'category' field to each FAQ
  const farmerFaq = [
    {
      title: 'How to list Fruit?',
      content:
        'To list a fruit, \n\n1) Go to the "My Fruits" section, \n2) Tap the "+" icon,\n3) Enter product details like name, weight, price, and upload a photo. \n4) Then tap "List".',
      image: require('../../assets/fruits/list.jpg'),
      category: 'List an Item',
    },
    {
      title: 'How to delete Listed Fruit?',
      content:
        'To delete listed fruit, \n\n1) Open the "My Fruits" section. \n2) Tap the three-dot menu next to the item you want to remove, then select "Delete". \n3) Confirm to remove the listing.',
      image: require('../../assets/fruits/list.jpg'),
      category: 'Delete a listed Item',
    },
    {
      title: 'How App works?',
      content:
        'The app connects farmers and buyers directly. You list your crops, and buyers can view, negotiate, and order directly from you.',
      image: require('../../assets/fruits/list.jpg'),
      category: 'Profile',
    },
    {
      title: 'How to manage Listed Fruit?',
      content:
        'To manage listed fruits, \n\n1) Go to "My Fruits" to edit quantity, price, or availability. \n2) You can also pause or update your listing anytime from this section.',
      image: require('../../assets/fruits/list.jpg'),
      category: 'Manage listed Item',
    },
  ];

  const buyerFaq = [
    {
      title: 'How to Deal with listed fruits?',
      content:
        'To deal with listed fruits,\n\n1) go to the product details and click "Contact Seller" or "Place Order".\n2) You can chat or call the farmer directly.',
      image: require('../../assets/fruits/list.jpg'),
      category: 'Buy an Item ',
    },
    {
      title: 'Filter usecase',
      content:
        'Use filters like location, price, fruit type, or freshness to quickly find the produce that best fits your requirements.',
      image: require('../../assets/fruits/list.jpg'),
      category: 'Go to search',
    },
    {
      title: 'How to manage Fruits?',
      content:
        'To manage fruits, \n\n1) Go to your "Orders" or "Deals" section to track ongoing orders. \n2) You can also save or favorite specific listings for easy access.',
      image: require('../../assets/fruits/list.jpg'),
      category: 'Manage your orders',
    },
  ];

  const faqList = userType === 'farmer' ? farmerFaq : buyerFaq;
  const faqTitle = userType === 'farmer' ? "Farmer's FAQ" : "Buyer's FAQ";

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
      <StatusBar barStyle="light-content" backgroundColor="#43B86C" translucent />

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
                      color="#43B86C"
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
    backgroundColor: 'rgba(67, 184, 108, 0.15)',
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

export default HelpGuideScreen;