import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../App'; // adjust the path if needed

const SettingsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [isNotificationEnabled, setIsNotificationEnabled] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Settings</Text>

      {/* Account Section */}
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('EditProfile')}>
          <View style={styles.left}>
            <FontAwesome name="pencil" size={20} color="#2E7D32" />
            <Text style={styles.rowText}>Edit Profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#444" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('ChangePassword')}>
          <View style={styles.left}>
            <FontAwesome name="lock" size={20} color="#2E7D32" />
            <Text style={styles.rowText}>Change Password</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#444" />
        </TouchableOpacity>
      </View>

      {/* Preferences Section */}
      <Text style={styles.sectionTitle}>App Preferences</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.left}>
            <FontAwesome name="bell" size={20} color="#2E7D32" />
            <Text style={styles.rowText}>Notifications</Text>
          </View>
          <Switch
            value={isNotificationEnabled}
            onValueChange={() => setIsNotificationEnabled(!isNotificationEnabled)}
            trackColor={{ false: '#ccc', true: '#81C784' }}
            thumbColor={isNotificationEnabled ? '#2E7D32' : '#f4f3f4'}
          />
        </View>

        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Languages')}>
          <View style={styles.left}>
            <FontAwesome name="globe" size={20} color="#2E7D32" />
            <Text style={styles.rowText}>Language</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#444" />
        </TouchableOpacity>


        <View style={styles.row}>
          <View style={styles.left}>
            <FontAwesome name="circle-o" size={20} color="#2E7D32" />
            <Text style={styles.rowText}>Theme</Text>
          </View>
          <Switch
            value={isDarkTheme}
            onValueChange={() => setIsDarkTheme(!isDarkTheme)}
            trackColor={{ false: '#ccc', true: '#81C784' }}
            thumbColor={isDarkTheme ? '#2E7D32' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* About Section */}
      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.left}>
            <FontAwesome name="info" size={20} color="#2E7D32" />
            <Text style={styles.rowText}>App Version</Text>
          </View>
          <Text style={styles.version}>3.15.2</Text>
        </View>

        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('AboutKrushimandi')}
        >
          <View style={styles.left}>
            <FontAwesome name="info" size={20} color="#2E7D32" />
            <Text style={styles.rowText}>About Krushimandi</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#444" />
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 26,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 10,
    color: '#333',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginLeft: 14,
  },
  version: {
    fontSize: 14,
    color: '#444',
  },
});
