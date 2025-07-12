import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

const ChangePasswordScreen = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('New password and confirm password do not match.');
      return;
    }

    Alert.alert('Success', 'Password changed successfully!');
    
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.wrapper}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Change Password</Text>

        <View style={styles.whiteBox}>
          <View style={styles.inputBlock}>
            <Text style={styles.label}>Current Password*</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="Enter current password"
              placeholderTextColor="#aaa"
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
          </View>

          <View style={styles.inputBlock}>
            <Text style={styles.label}>New Password*</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="Enter new password"
              placeholderTextColor="#aaa"
              value={newPassword}
              onChangeText={setNewPassword}
            />
          </View>

          <View style={styles.inputBlock}>
            <Text style={styles.label}>Confirm New Password*</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="Confirm new password"
              placeholderTextColor="#aaa"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleChangePassword}>
            <Text style={styles.saveText}>Save Password</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ChangePasswordScreen;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  heading: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1D1D1D',
    marginBottom: 20,
    marginTop: 26,
  },
  whiteBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    marginTop: 10,
  },
  inputBlock: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    fontSize: 15,
    paddingVertical: 6,
    color: '#000',
  },
  saveButton: {
    backgroundColor: '#C8E6C9',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
