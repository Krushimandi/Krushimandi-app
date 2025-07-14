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
  StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const PRIMARY = '#43B86C';
const BG_LIGHT = '#F9FAFB';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#1F2937';

const windowWidth = Dimensions.get('window').width;

const FaqDetail = ({ route, navigation }) => {
  const { title, content, image, category } = route.params;

  // State to store image dimensions
  const [imgSize, setImgSize] = useState({ width: windowWidth - 64, height: 200 });

  // Get actual image size and set wrapper size accordingly
  React.useEffect(() => {
    if (image) {
      Image.getSize(
        typeof image === 'number' ? Image.resolveAssetSource(image).uri : image,
        (w, h) => {
          const maxWidth = windowWidth - 64;
          let width = maxWidth;
          let height = (h / w) * width;
          if (height > 350) {
            height = 350;
            width = (w / h) * height;
          }
          setImgSize({ width, height });
        },
        () => {
          setImgSize({ width: windowWidth - 64, height: 200 });
        }
      );
    }
  }, [image]);

  const handleCategoryPress = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#43B86C" translucent />

      {/* Header with same styling as HelpGuideScreen */}
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
            <Text style={styles.headerTitle}>Help</Text>
            <Text style={styles.headerSubtitle}>Frequently Asked Questions</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {image && (
          <View style={[styles.imageWrapper, { width: imgSize.width, height: imgSize.height + 16 }]}>
            <View style={[styles.imageShadow, { width: imgSize.width, height: imgSize.height + 16 }]}>
              <Image
                source={image}
                style={[styles.image, { width: imgSize.width, height: imgSize.height }]}
                resizeMode="contain"
              />
            </View>
          </View>
        )}
        
        <View style={styles.questionTitleWrapper}>
          <Text style={styles.questionTitle}>{title}</Text>
        </View>
        
        <View style={styles.cardContent}>
          <Text style={styles.content}>{content}</Text>
        </View>
      </ScrollView>
      
      {category && (
        <View style={styles.categoryButtonRow}>
          <TouchableOpacity
            style={styles.categoryButton}
            onPress={handleCategoryPress}
            activeOpacity={0.85}
          >
            <Text style={styles.categoryButtonText}>{category}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_LIGHT,
  },
  // Header styles matching HelpGuideScreen
  headerContainer: {
    position: 'relative',
    paddingTop: StatusBar.currentHeight || 44,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: PRIMARY,
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
    backgroundColor: PRIMARY,
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
    backgroundColor: PRIMARY,
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
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  imageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    backgroundColor: 'transparent',
  },
  imageShadow: {
    borderRadius: 24,
    backgroundColor: '#fff',
    shadowColor: PRIMARY,
    shadowOpacity: 0.13,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    borderRadius: 16,
    backgroundColor: '#F0F4F8',
  },
  questionTitleWrapper: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    width: '100%',
    padding: 20,
    shadowColor: PRIMARY,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(67, 184, 108, 0.05)',
  },
  questionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'center',
    letterSpacing: 0.2,
    lineHeight: 26,
  },
  cardContent: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 20,
    shadowColor: PRIMARY,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(67, 184, 108, 0.05)',
  },
  content: {
    fontSize: 16,
    color: TEXT_DARK,
    lineHeight: 28,
    textAlign: 'left',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  categoryButtonRow: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: BG_LIGHT,
    alignItems: 'center',
  },
  categoryButton: {
    width: '85%',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: PRIMARY,
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 16,
    elevation: 4,
    shadowColor: PRIMARY,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  categoryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
});

export default FaqDetail;