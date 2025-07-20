import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ImageBackground,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
const quickActions = [
  {
    title: 'Farmer\nSupport',
    image: require('../../assets/help2.jpg'),
    onPress: () => alert('Farmer Support clicked'),
  },
  {
    title: 'Chat with\nSupport',
    image: require('../../assets/help1.jpg'),
    onPress: () => alert('Chat with KrushiMitra clicked'),
  },
];

const assistanceList = [
  {
    title: 'How to Sell',
    subtitle: 'Step-by-step guide to start selling your produce',
    icon: 'help-circle-outline',
    onPress: () => navigation.navigate('HelpGuide', { userType: 'farmer' }),
    color: '#3B82F6',
  },
  {
    title: 'Price Meter Info',
    subtitle: 'Understand how Krushimandi shows market-based price range',
    icon: 'wallet-outline',
    onPress: () => alert('Price Meter Info clicked'),
    color: '#059669',
  },
  {
    title: 'Commission Model',
    subtitle: 'Know how commission is charged and how much',
    icon: 'briefcase-outline',
    onPress: () => alert('Commission Info clicked'),
    color: '#DC2626',
  },
  {
    title: 'Farmer Rank System',
    subtitle: 'Your rank is based on quality & fair pricing',
    icon: 'bar-chart-outline',
    onPress: () => alert('Ranking Info clicked'),
    color: '#F59E0B',
  },
];


const HelpScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#43B86C" translucent />

      {/* Header with same styling as SettingsScreen */}
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
            <Text style={styles.headerTitle}>Help Center</Text>
            <Text style={styles.headerSubtitle}>Get help and support</Text>
          </View>

          {/* <View style={styles.headerButton} /> */}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Search Bar */}
        {/* <View style={styles.searchCard}>
          <View style={styles.searchBarWrapper}>
            <View style={styles.searchIconContainer}>
              <Icon name="search" size={20} color="#43B86C" />
            </View>
            <TextInput
              placeholder="Search by topics"
              placeholderTextColor="#9CA3AF"
              style={styles.searchBar}
            />
          </View>
        </View> */}

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={styles.quickCard}
              activeOpacity={0.8}
              onPress={quickActions[0].onPress}
            >
              <ImageBackground
                source={quickActions[0].image}
                style={styles.quickImageBg}
                imageStyle={styles.quickImageBgImg}
                resizeMode="cover"
              >
                <View style={styles.quickTitleWrapper}>
                  <Text style={styles.quickTitle}>{quickActions[0].title}</Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickCard}
              activeOpacity={0.8}
              onPress={quickActions[1].onPress}
            >
              <ImageBackground
                source={quickActions[1].image}
                style={styles.quickImageBg}
                imageStyle={styles.quickImageBgImg}
                resizeMode="cover"
              >
                <View style={styles.quickTitleWrapper}>
                  <Text style={styles.quickTitle}>{quickActions[1].title}</Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          </View>
        </View>

        {/* Assistance Section */}
        <View style={styles.assistanceContainer}>
          <Text style={styles.sectionTitle}>Financial Assistance Hub</Text>
          <View style={styles.assistanceItems}>
            {assistanceList.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.assistanceItem,
                  index === assistanceList.length - 1 && styles.lastItem
                ]}
                activeOpacity={0.7}
                onPress={index === 0 ? () => navigation.navigate('HelpGuide', { userType: 'farmer' }) : item.onPress}
              >
                <View style={styles.assistanceLeft}>
                  <View style={[
                    styles.assistanceIconContainer,
                    { backgroundColor: item.color + '15' }
                  ]}>
                    <Icon
                      name={item.icon}
                      size={22}
                      color={item.color}
                    />
                  </View>

                  <View style={styles.assistanceInfo}>
                    <Text style={styles.assistanceTitle}>{item.title}</Text>
                    <Text style={styles.assistanceSubtitle}>{item.subtitle}</Text>
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

export default HelpScreen;

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
    top: 20, // match your paddingVertical
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
  searchCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: '#43B86C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.05)',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIconContainer: {
    marginRight: 12,
  },
  searchBar: {
    fontSize: 16,
    flex: 1,
    color: '#1F2937',
    padding: 0,
  },
  quickActionsContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
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
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickCard: {
    width: CARD_WIDTH,
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#E5E7EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DBCC',
  },
  quickImageBg: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  quickImageBgImg: {
    borderRadius: 20,
    opacity: 0.6,
  },

  quickTitleWrapper: {
    width: '100%',
    paddingLeft: 20,
    paddingBottom: 20,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  quickTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'left',
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  assistanceContainer: {
    marginHorizontal: 20,
  },
  assistanceItems: {
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
  assistanceItem: {
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
  assistanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  assistanceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  assistanceInfo: {
    flex: 1,
  },
  assistanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  assistanceSubtitle: {
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