import { useState } from 'react';
import OcrPlugin from '../plugins/ocr-plugin';
import type { OcrResult } from '../plugins/ocr-plugin';

export const OcrScanner = () => {
    const [result, setResult] = useState<OcrResult | null>(null);
    const [loading, setLoading] = useState(false);

    const scanFromCamera = async () => {
        setLoading(true);
        try {
            const ocrResult = await OcrPlugin.scanTextFromCamera();
            setResult(ocrResult);
        } catch (error) {
            console.error('Camera scan error:', error);
            setResult({
                success: false,
                text: '',
                error: String(error)
            });
        } finally {
            setLoading(false);
        }
    };

    const scanFromGallery = async () => {
        setLoading(true);
        try {
            const ocrResult = await OcrPlugin.scanTextFromGallery();
            setResult(ocrResult);
        } catch (error) {
            console.error('Gallery scan error:', error);
            setResult({
                success: false,
                text: '',
                error: String(error)
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2>OCR Text Scanner</h2>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button 
                    onClick={scanFromCamera}
                    disabled={loading}
                    style={{
                        padding: '10px 20px',
                        fontSize: '16px',
                        cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                >
                    📷 Scan from Camera
                </button>
                
                <button 
                    onClick={scanFromGallery}
                    disabled={loading}
                    style={{
                        padding: '10px 20px',
                        fontSize: '16px',
                        cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                >
                    🖼️ Scan from Gallery
                </button>
            </div>

            {loading && <p>Processing image...</p>}

            {result && (
                <div style={{
                    border: '1px solid #ccc',
                    padding: '15px',
                    borderRadius: '8px',
                    backgroundColor: result.success ? '#f0f9ff' : '#fff0f0'
                }}>
                    <h3>Result:</h3>
                    {result.success ? (
                        <>
                            <p><strong>Detected Text:</strong></p>
                            <pre style={{
                                whiteSpace: 'pre-wrap',
                                backgroundColor: '#fff',
                                padding: '10px',
                                borderRadius: '4px'
                            }}>
                                {result.text || 'No text detected'}
                            </pre>
                            
                            {result.blocks && result.blocks.length > 0 && (
                                <>
                                    <p><strong>Text Blocks ({result.blocks.length}):</strong></p>
                                    {result.blocks.map((block, index) => (
                                        <div key={index} style={{
                                            backgroundColor: '#fff',
                                            padding: '8px',
                                            marginBottom: '8px',
                                            borderRadius: '4px',
                                            fontSize: '14px'
                                        }}>
                                            <div><strong>Block {index + 1}:</strong> {block.text}</div>
                                            {block.lines && block.lines.length > 0 && (
                                                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                                    Lines: {block.lines.length}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </>
                            )}
                        </>
                    ) : (
                        <p style={{ color: 'red' }}>
                            <strong>Error:</strong> {result.error || 'Failed to scan text'}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};
