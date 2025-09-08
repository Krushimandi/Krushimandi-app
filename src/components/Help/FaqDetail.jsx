import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  SafeAreaView,
  StatusBar,
  Animated
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY = '#43B86C';
const BG_LIGHT = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#1F2937';
const ACCENT_GREEN = '#10B981';
const LIGHT_GRAY = '#F3F4F6';

const windowWidth = Dimensions.get('window').width;

const FaqDetail = ({ route, navigation }) => {
  const { title, content, image, category } = route.params;
  const insets = useSafeAreaInsets();

  // State to store image dimensions
  const [imgSize, setImgSize] = useState({ width: windowWidth - 64, height: 200 });
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  // Get actual image size and set wrapper size accordingly
  React.useEffect(() => {
    // Start entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    if (image) {
      Image.getSize(
        typeof image === 'number' ? Image.resolveAssetSource(image).uri : image,
        (w, h) => {
          const maxWidth = windowWidth - 48;
          let width = maxWidth;
          let height = (h / w) * width;
          if (height > 280) {
            height = 280;
            width = (w / h) * height;
          }
          setImgSize({ width, height });
        },
        () => {
          setImgSize({ width: windowWidth - 48, height: 200 });
        }
      );
    }
  }, [image, fadeAnim, slideAnim]);

  const handleCategoryPress = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} translucent />
      
      {/* Modern Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Icon name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Help Center</Text>
          </View>
          
          <View style={styles.headerRight}>
            {/* {category && (
              <View style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{category}</Text>
              </View>
            )} */}
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={true}
      >
        <Animated.View 
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Question Title Card */}
          <View style={styles.titleCard}>
            <View style={styles.titleIconContainer}>
              <Icon name="help-circle" size={24} color={PRIMARY} />
            </View>
            <Text style={styles.questionTitle}>{title}</Text>
          </View>

          {/* Image Section */}
          {image && (
            <View style={styles.imageContainer}>
              <View style={[styles.imageWrapper, { width: imgSize.width, height: imgSize.height }]}>
                <Image
                  source={image}
                  style={[styles.image, { width: imgSize.width, height: imgSize.height }]}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlay} />
              </View>
            </View>
          )}
          
          {/* Answer Content Card */}
          <View style={styles.answerCard}>
            <View style={styles.answerHeader}>
              <Icon name="checkmark-circle" size={24} color={ACCENT_GREEN} />
              <Text style={styles.answerHeaderText}>Solution</Text>
            </View>
            <Text style={styles.content}>{content}</Text>
          </View>

          {/* Additional Info Cards */}
          <View style={styles.infoCardsContainer}>
            <View style={styles.infoCard}>
              <Icon name="information-circle-outline" size={20} color="#6366F1" />
              <Text style={styles.infoCardText}>Was this helpful?</Text>
              <View style={styles.feedbackButtons}>
                <TouchableOpacity style={[styles.feedbackBtn, styles.yesBtn]} activeOpacity={0.8}>
                  <Icon name="thumbs-up" size={16} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.feedbackBtn, styles.noBtn]} activeOpacity={0.8}>
                  <Icon name="thumbs-down" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.contactCard} 
              activeOpacity={0.9}
              onPress={() => navigation.goBack()}
            >
              <Icon name="chatbubble-ellipses" size={20} color={PRIMARY} />
              <Text style={styles.contactCardText}>Still need help? Contact support</Text>
              <Icon name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_LIGHT,
  },
  
  // Modern Header Styles
  headerContainer: {
    backgroundColor: PRIMARY,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerRight: {
    marginLeft: 16,
  },
  categoryChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Content Styles
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Title Card
  titleCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  titleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${PRIMARY}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_DARK,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.2,
  },

  // Image Styles
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  imageWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    position: 'relative',
  },
  image: {
    borderRadius: 16,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(67, 184, 108, 0.05)',
    borderRadius: 16,
  },

  // Answer Card
  answerCard: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 24,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  answerHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_DARK,
    marginLeft: 10,
  },
  content: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: 0.2,
  },

  // Info Cards
  infoCardsContainer: {
    gap: 16,
  },
  infoCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoCardText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_DARK,
    marginLeft: 12,
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  feedbackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  yesBtn: {
    backgroundColor: ACCENT_GREEN,
  },
  noBtn: {
    backgroundColor: '#EF4444',
  },
  contactCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY,
  },
  contactCardText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_DARK,
    marginLeft: 12,
  },
});

export default FaqDetail;