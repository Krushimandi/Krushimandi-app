import React from 'react';
import { View, Text, StyleSheet, Image, SafeAreaView, StatusBar } from 'react-native';
import { useRemoteConfig } from '../../hooks/useRemoteConfig';

const UnderMaintenanceScreen: React.FC = () => {
    const rc = useRemoteConfig();
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <View style={styles.content}>
                <Image source={require('../../assets/maintenance.png')} style={styles.image} resizeMode="contain" />
                <Text style={styles.title}>We'll be back soon</Text>
                {!!rc.maintenanceMessage && <Text style={styles.message}>{rc.maintenanceMessage}</Text>}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    image: { width: '70%', height: 200, marginBottom: 24 },
    title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
    message: { fontSize: 16, color: '#374151', textAlign: 'center' },
});

export default UnderMaintenanceScreen;
