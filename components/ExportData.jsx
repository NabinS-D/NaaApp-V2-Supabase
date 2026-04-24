import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { openDocumentTree, writeFile } from "react-native-saf-x";
import RNFS from "react-native-fs";
import RNHTMLtoPDF from "react-native-html-to-pdf";

const ExportData = ({
    data,
    columns,
    title,
    buttonTitle = 'Export',
    buttonStyle = {},
    iconName = 'file-download',
    iconSize = 24,
    iconColor = '#fff',
    onExportStart,
    onExportComplete,
    onError,
    showIcon = true,
    showAlert,
}) => {
    const [isExporting, setIsExporting] = useState(false);

    const saveFileWithSAF = async (content, fileName, mimeType, encoding = 'utf8') => {
        try {
            // Open document tree picker to let user select directory
            const directoryResult = await openDocumentTree(true);

            // Check if the result is null (user canceled)
            if (!directoryResult) {
                return {
                    success: false,
                    canceled: true,
                    message: 'Directory selection was canceled',
                };
            }

            // Check for uri
            const { uri } = directoryResult;

            if (!uri) {
                return {
                    success: false,
                    canceled: true,
                    message: 'Directory access not granted - no URI returned',
                };
            }

            // Create the file path in the selected directory
            const filePath = `${uri}/${fileName}`;

            // Write content to the file
            await writeFile(filePath, content, {
                encoding: encoding,
                mimeType: mimeType,
            });

            return {
                success: true,
                uri: filePath,
                message: `File saved successfully: ${fileName}`,
            };
        } catch (error) {
            console.error('File Save Error:', error);
            return {
                success: false,
                error: error.message,
                message: `Failed to save file: ${error.message}`,
            };
        }
    };

    const exportToCSV = async () => {
        if (!data?.length) {
            showAlert?.('Error', 'No data to export', 'error') || alert('Error: No data to export');
            return;
        }

        try {
            setIsExporting(true);
            onExportStart?.();

            // Create filename with timestamp
            const fileName = `NaaApp_Export_${new Date().toISOString().split('T')[0]}.csv`;

            // Create CSV header and rows
            let csvContent = '';

            // Add headers
            if (columns?.length) {
                csvContent += columns.map(col => `"${col.header || col.key}"`).join(',') + '\n';
            } else {
                csvContent += Object.keys(data[0]).map(key => `"${key}"`).join(',') + '\n';
            }

            // Add data rows
            data.forEach(item => {
                if (columns?.length) {
                    const row = columns.map(col => {
                        let value = col.render ? col.render(item) : item[col.key];
                        // Handle different value types
                        if (value === null || value === undefined) value = '';
                        if (value instanceof Date) value = value.toISOString().split('T')[0];
                        return `"${String(value).replace(/"/g, '""')}"`;
                    });
                    csvContent += row.join(',') + '\n';
                } else {
                    const row = Object.values(item).map(value => {
                        if (value === null || value === undefined) return '';
                        if (value instanceof Date) value = value.toISOString().split('T')[0];
                        return `"${String(value).replace(/"/g, '""')}"`;
                    });
                    csvContent += row.join(',') + '\n';
                }
            });

            // Save file using SAF (Storage Access Framework)
            const result = await saveFileWithSAF(csvContent, fileName, 'text/csv');

            // Show appropriate message based on result
            if (result.success) {
                showAlert?.('Success', 'CSV exported successfully!', 'success');
            } else if (result.canceled) {
                // Don't show alert for cancelled operations
            } else {
                showAlert?.('Error', result.message || 'Failed to export data', 'error') || alert('Error: ' + (result.message || 'Failed to export data'));
            }

            if (result.success) {
                onExportComplete?.();
            } else if (result.canceled) {
                onExportComplete?.(); // Call completion callback even when canceled
            } else {
                onError?.(new Error(result.message || 'Export failed'));
            }
        } catch (error) {
            console.error('Export Error:', error);
            showAlert?.('Error', `Failed to export data: ${error.message}`, 'error') || alert('Error: Failed to export data: ' + error.message);
            onError?.(error);
        } finally {
            setIsExporting(false);
        }
    };

    const exportToPDF = async () => {
        if (!data?.length) {
            showAlert?.('Error', 'No data to export', 'error') || alert('Error: No data to export');
            return;
        }

        try {
            setIsExporting(true);
            onExportStart?.();

            // Generate timestamp for filename
            const timestamp = new Date().toISOString().split('T')[0];
            const randomNumber = Math.floor(Math.random() * 100000);
            const fileName = `NaaApp_${title.replace(/\s+/g, '_')}_${timestamp}_${randomNumber}.pdf`;

            // Calculate total expenses
            const totalExpenses = data.reduce((sum, item) => {
                const amount = parseFloat(item.amount);
                return sum + (isNaN(amount) ? 0 : amount);
            }, 0);

            // Generate HTML for PDF
            const htmlContent = `
            <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        h1 { color: #C71585; text-align: center; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                        th { background-color: #C71585; color: white; }
                        tr:nth-child(even) { background-color: #F5F5F5; }
                        .total { font-weight: bold; background-color: #C71585; color: #000000; }
                    </style>
                </head>
                <body>
                    <h1>NaaApp ${title}</h1>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                    <table>
                        <tr>
                            ${columns?.map(col => `<th>${col.header || col.key}</th>`).join('')}
                        </tr>
                        ${data.map(item => `
                            <tr>
                                ${columns?.map(col => {
                const value = col.render ? col.render(item) : item[col.key];
                return `<td>${value || 'N/A'}</td>`;
            }).join('')}
                            </tr>
                        `).join('')}
                        <tr class="total">
                            ${columns?.map(col => {
                if (col.key === 'amount') {
                    return `<td>Total: Rs ${totalExpenses.toFixed(2)}</td>`;
                } else {
                    return `<td></td>`;
                }
            }).join('')}
                        </tr>
                    </table>
                </body>
            </html>
            `;

            // Create temporary PDF file
            const tempFileName = fileName.replace('.pdf', '');
            const options = {
                html: htmlContent,
                fileName: tempFileName,
                directory: RNFS.CachesDirectoryPath,
            };

            const pdf = await RNHTMLtoPDF.convert(options);

            // Read the PDF file as base64
            const pdfContent = await RNFS.readFile(pdf.filePath, 'base64');

            // Save using SAF
            const result = await saveFileWithSAF(
                pdfContent,
                fileName,
                'application/pdf',
                'base64'
            );

            // Clean up temporary file
            try {
                await RNFS.unlink(pdf.filePath);
            } catch (cleanupError) {
                console.warn('Failed to cleanup temp PDF file:', cleanupError);
            }

            // Show appropriate message based on result
            if (result.success) {
                showAlert?.('Success', 'PDF exported successfully!', 'success');
            } else if (result.canceled) {
                // Don't show alert for cancelled operations
            } else {
                showAlert?.('Error', result.message || 'Failed to export PDF', 'error') || alert('Error: ' + (result.message || 'Failed to export PDF'));
            }

            if (result.success) {
                onExportComplete?.();
            } else if (result.canceled) {
                onExportComplete?.(); // Call completion callback even when canceled
            } else {
                onError?.(new Error(result.message || 'Export failed'));
            }
        } catch (error) {
            console.error('PDF Export Error:', error);
            showAlert?.('Error', `Failed to export PDF: ${error.message}`, 'error') || alert('Error: Failed to export PDF: ' + error.message);
            onError?.(error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExport = async (format) => {
        try {
            if (format === 'csv') {
                await exportToCSV();
            } else if (format === 'pdf') {
                await exportToPDF();
            }
        } catch (error) {
            console.error('Export failed:', error);
            showAlert?.('Error', `Export failed - ${error.message}`, 'error') || alert('Error: Export failed - ' + error.message);
        }
    };

    if (isExporting) {
        return (
            <View style={[styles.exportButton, buttonStyle]}>
                <ActivityIndicator color={iconColor} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.exportButton, buttonStyle]}
                onPress={() => handleExport('csv')}
                disabled={isExporting}
            >
                {showIcon && (
                    <MaterialIcons
                        name="table-chart"
                        size={iconSize}
                        color={iconColor}
                        style={styles.icon}
                    />
                )}
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.exportButton, buttonStyle, { marginLeft: 10 }]}
                onPress={() => handleExport('pdf')}
                disabled={isExporting}
            >
                {showIcon && (
                    <MaterialIcons
                        name="picture-as-pdf"
                        size={iconSize}
                        color={iconColor}
                        style={styles.icon}
                    />
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    exportButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#C71585',
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        marginRight: 0,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default ExportData;
