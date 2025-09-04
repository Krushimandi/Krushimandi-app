import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  Image,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthStep } from '../../utils/authFlow';
import { saveUserRole } from '../../utils/userRoleStorage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import { navigateToMain } from '../../utils/navigationUtils';

const RoleSelectionScreen = ({ navigation }) => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Entrance animation
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
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  // Skip this screen for existing/returning users whose onboarding is complete
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const fbUser = auth().currentUser;
        const [userDataStr, authStep] = await Promise.all([
          AsyncStorage.getItem('userData'),
          AsyncStorage.getItem('authStep')
        ]);
        const userData = userDataStr ? JSON.parse(userDataStr) : null;
        const hasRole = !!userData?.userRole;
        const profileComplete = userData?.isProfileComplete === true;
        const isComplete = authStep === 'Complete';

        if (fbUser && (isComplete || (hasRole && profileComplete))) {
          navigateToMain();
        }
      } catch (e) {
        // no-op
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
  };
  const handleGetStarted = async () => {
    if (selectedRole) {
      setIsLoading(true);
      try {
        // Save role to dedicated localStorage
        await saveUserRole(selectedRole);

        // Also persist role inside userData for backward compatibility (merge, don't overwrite)
        try {
          const existing = await AsyncStorage.getItem('userData');
          const merged = existing ? { ...JSON.parse(existing), userRole: selectedRole } : { userRole: selectedRole, createdAt: new Date().toISOString() };
          await AsyncStorage.setItem('userData', JSON.stringify(merged));
        } catch (mergeErr) {
          console.warn('⚠️ Failed merging userData while saving role, writing minimal payload:', mergeErr);
          await AsyncStorage.setItem('userData', JSON.stringify({ userRole: selectedRole, createdAt: new Date().toISOString() }));
        }

        // Update auth step
        await setAuthStep('RoleSelected');

        console.log('Selected role saved to localStorage:', selectedRole);
        navigation.navigate('IntroduceYourself', { userRole: selectedRole });
      } catch (err) {
        console.error('Error saving role:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // const showHelp = () => {
  //   // Could show help modal
  //   console.log('Help pressed');
  // };

  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF" />

      <View style={styles.innerContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>

          {/* <TouchableOpacity onPress={showHelp} style={styles.helpButton}>
            <Ionicons name="help-circle-outline" size={24} color="#007E2F" />
          </TouchableOpacity> */}
        </View>

        {/* Main Content (scrollable) */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            {/* Illustration */}
            <View style={styles.illustrationContainer}>
              <View style={styles.illustrationBackground}>
                {/* Placeholder illustration - you can replace with actual image */}
                <Image
                  source={require('../../assets/images/illus.png')}
                  style={{ width: 280, height: 280 }}
                  resizeMode="center"
                />
              </View>
            </View>

            {/* Title and Description */}
            <View style={styles.textContainer}>
              <Text style={styles.heading}>Choose your role</Text>
              <Text style={styles.subtext}>
                Select <Text style={styles.highlightText}>Farmer</Text> if you want to sell fruits
              </Text>
              <Text style={styles.subtext}>
                or <Text style={styles.highlightText}>Buyer</Text> if you want to purchase
              </Text>
            </View>

            {/* Role Selection Cards */}
            <View style={styles.roleContainer}>
              {/* Farmer Card */}
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  styles.farmerCard,
                  selectedRole === 'farmer' && styles.roleCardSelected
                ]}
                onPress={() => handleRoleSelect('farmer')}
                activeOpacity={0.8}
              >
                <View style={[styles.roleIcon, styles.farmerIcon]}>
                  <Ionicons name="leaf" size={32} color="#007E2F" />
                </View>
                <Text style={[styles.roleText, selectedRole === 'farmer' && styles.roleTextSelected]}>
                  Farmer
                </Text>
                {selectedRole === 'farmer' && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={24} color="#007E2F" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Buyer Card */}
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  styles.buyerCard,
                  selectedRole === 'buyer' && styles.roleCardSelected
                ]}
                onPress={() => handleRoleSelect('buyer')}
                activeOpacity={0.8}
              >
                <View style={[styles.roleIcon, styles.buyerIcon]}>
                  <Ionicons name="storefront" size={32} color="#FF6B6B" />
                </View>
                <Text style={[styles.roleText, selectedRole === 'buyer' && styles.roleTextSelected]}>
                  Buyer
                </Text>
                {selectedRole === 'buyer' && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={24} color="#FF6B6B" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Security note */}
            <View style={styles.securityNote}>
              <Ionicons name="shield-checkmark" size={16} color="#007E2F" />
              <Text style={styles.securityText}>
                You can change your role later in settings if needed
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Get Started Button */}
        <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity
            style={[
              styles.getStartedButton,
              !selectedRole && styles.getStartedButtonDisabled
            ]}
            onPress={handleGetStarted}
            disabled={!selectedRole || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.getStartedText}>Get started</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 28,
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
    minHeight: 60,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
  },
  helpButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#E8F5E8',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120, // Prevent content from being hidden behind the bottom button
  },
  illustrationContainer: {
    marginBottom: 40,
  },
  illustrationBackground: {
    width: 280,
    height: 200,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  personLeft: {
    alignItems: 'center',
  },
  personRight: {
    alignItems: 'center',
  },
  personAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  personAvatarFemale: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFE8E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  personLabel: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  subtext: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  highlightText: {
    color: '#007E2F',
    fontWeight: '600',
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
    gap: 16,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8E8E8',
    position: 'relative',
    minHeight: 140,
    justifyContent: 'center',
  },
  farmerCard: {
    backgroundColor: '#F8FFF8',
  },
  buyerCard: {
    backgroundColor: '#FFF8F8',
  },
  roleCardSelected: {
    borderWidth: 3,
    shadowColor: '#007E2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  roleIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  farmerIcon: {
    backgroundColor: '#E8F5E8',
  },
  buyerIcon: {
    backgroundColor: '#FFE8E8',
  },
  roleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  roleTextSelected: {
    color: '#007E2F',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
    marginHorizontal: 20,
  },
  securityText: {
    fontSize: 14,
    color: '#007E2F',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
    textAlign: 'center',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 24,
    right: 24,
    paddingBottom: 34,
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
  },
  getStartedButton: {
    backgroundColor: '#007E2F',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007E2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  getStartedButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  getStartedText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default RoleSelectionScreen;
