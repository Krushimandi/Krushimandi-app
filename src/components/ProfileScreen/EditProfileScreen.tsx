import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';

const EditProfileScreen = () => {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const pickImage = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response: any) => {
      if (!response.didCancel && response.assets?.[0]?.uri) {
        setProfileImage(response.assets[0].uri);
      }
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Edit Profile</Text>

      {/* Profile Image Section */}
      <View style={styles.profileSection}>
        <View style={styles.imageWrapper}>
          <Image
            source={
              profileImage
                ? { uri: profileImage }
                : require('../../../assets/profile.jpg')
            }
            style={styles.profileImage}
          />
          <TouchableOpacity style={styles.editIcon} onPress={pickImage}>
            <Ionicons name="camera" size={18} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {/* White Background Form Box */}
      <View style={styles.whiteBox}>
        <View style={styles.inputBlock}>
          <Text style={styles.label}>First Name*</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Enter first name"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputBlock}>
          <Text style={styles.label}>Last Name*</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Enter last name"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputBlock}>
          <Text style={styles.label}>Email*</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="Enter email address"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputBlock}>
          <Text style={styles.label}>Phone Number*</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="Enter phone number"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputBlock}>
          <Text style={styles.label}>Address*</Text>
          <TextInput
            style={[styles.input, { height: 60 }]}
            value={address}
            onChangeText={setAddress}
            multiline
            placeholder="Enter address"
            placeholderTextColor="#999"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    flexGrow: 1,
  },
  heading: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1D1D1D',
    marginBottom: 10,
    marginTop: 26,
  },
  profileSection: {
    alignItems: 'center',
    marginVertical: 16,
  },
  imageWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: '#ccc',
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#C8E6C9',
    padding: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
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
    color: '#555',
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
