import React, { useState, useEffect } from "react";
import {
    Text,
    View,
    StyleSheet,
    Modal,
    TouchableOpacity,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { MaterialIcons } from "@expo/vector-icons";

const QRScanner = ({ visible, onClose, onScan }) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        if (!permission) {
            requestPermission();
        }
    }, [permission]);

    const handleBarCodeScanned = ({ type, data }) => {
        setScanned(true);

        try {
            // Try parse JSON (custom expense QR codes)
            const parsedData = JSON.parse(data);
            onScan(parsedData, "qr");
        } catch {
            // Otherwise pass raw string
            onScan({ rawData: data }, "text");
        }
    };

    if (!permission) {
        return <Text>Requesting camera permission...</Text>;
    }
    if (!permission.granted) {
        return (
            <View style={styles.center}>
                <Text>No access to camera</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.scanAgainButton}>
                    <Text style={styles.scanAgainText}>Grant Camera Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <Modal visible={visible} animationType="slide">
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Scan QR Code</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <MaterialIcons name="close" size={24} color="white" />
                    </TouchableOpacity>
                </View>

                <CameraView
                    style={styles.camera}
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ["qr"], // keep only "qr" for reliability
                    }}
                />

                <View style={styles.overlay}>
                    <View style={styles.scanArea} />
                    <Text style={styles.instruction}>
                        Position QR code within the frame
                    </Text>
                </View>

                {scanned && (
                    <View style={styles.scannedContainer}>
                        <Text style={styles.scannedText}>QR Code Scanned!</Text>
                        <TouchableOpacity
                            style={styles.scanAgainButton}
                            onPress={() => setScanned(false)}
                        >
                            <Text style={styles.scanAgainText}>Tap to Scan Again</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "black" },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        paddingTop: 50,
        backgroundColor: "rgba(0,0,0,0.8)",
    },
    title: { color: "white", fontSize: 20, fontWeight: "bold" },
    closeButton: { padding: 10 },
    camera: { flex: 1 },
    overlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
    },
    scanArea: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: "white",
        backgroundColor: "transparent",
    },
    instruction: {
        color: "white",
        fontSize: 16,
        marginTop: 20,
        textAlign: "center",
    },
    scannedContainer: {
        position: "absolute",
        bottom: 100,
        left: 20,
        right: 20,
        backgroundColor: "rgba(0,0,0,0.8)",
        padding: 20,
        borderRadius: 10,
    },
    scannedText: {
        color: "white",
        fontSize: 18,
        textAlign: "center",
        marginBottom: 10,
    },
    scanAgainButton: {
        backgroundColor: "#4CAF50",
        padding: 10,
        borderRadius: 5,
    },
    scanAgainText: { color: "white", textAlign: "center", fontSize: 16 },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "black",
    },
});

export default QRScanner;
