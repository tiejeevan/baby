import { useState, useEffect } from 'react';
import { Sparkles, Save, RotateCcw, Upload, CheckCircle, XCircle } from 'lucide-react';
import { aiService } from '../../services/ai';
import type { AIConfig } from '../../services/ai';
import TFLitePlugin from '../../plugins/tflite-plugin';
import './AISettingsComponent.css';

export default function AISettingsComponent() {
    const [config, setConfig] = useState<AIConfig>(aiService.getConfig());
    const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [saved, setSaved] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        checkModelStatus();
    }, []);

    const checkModelStatus = async () => {
        const ready = await aiService.isReady();
        setModelStatus(ready ? 'ready' : 'error');
    };

    const handleSave = () => {
        aiService.updateConfig(config);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleReset = () => {
        const defaultConfig = {
            maxTokens: 512,
            temperature: 0.7,
            systemPrompt: `You are a helpful AI assistant for a pregnancy tracking app. 
You provide supportive, accurate, and empathetic information about pregnancy, health, and wellness.
Always remind users to consult healthcare professionals for medical advice.
Keep responses concise and friendly.`
        };
        setConfig(defaultConfig);
    };

    const handleModelUpload = async () => {
        try {
            setUploading(true);
            setUploadStatus(null);

            console.log('Starting model upload...');
            
            setUploadStatus({
                type: 'success',
                message: `Opening file picker...`
            });

            // Call the plugin to open file picker and load model
            // The Android plugin will handle the file picker and loading
            console.log('Calling TFLitePlugin.loadModelFromUri...');
            const result = await TFLitePlugin.loadModelFromUri({
                uri: '', // Empty URI triggers file picker in Android
                fileName: 'selected-model.task'
            });

            console.log('Plugin result:', result);

            if (result.success) {
                const sizeInMB = result.size ? (result.size / (1024 * 1024)).toFixed(1) : 'unknown';
                
                // Verify model is actually loaded
                console.log('Verifying model status...');
                const isLoaded = await aiService.isReady();
                console.log('Model loaded status:', isLoaded);
                
                setUploadStatus({
                    type: 'success',
                    message: `✅ Success! Model is now loaded and ready to use (${sizeInMB} MB)`
                });
                
                // Update model status to ready
                setModelStatus('ready');
                
                // Force a re-check after a short delay to ensure state is updated
                setTimeout(async () => {
                    const recheckStatus = await aiService.isReady();
                    console.log('Recheck model status:', recheckStatus);
                    setModelStatus(recheckStatus ? 'ready' : 'error');
                }, 500);
            } else {
                setUploadStatus({
                    type: 'error',
                    message: `Failed to load model: ${result.message || 'Unknown error'}`
                });
                setModelStatus('error');
            }
            
        } catch (error: any) {
            console.error('Error uploading model:', error);
            console.error('Error details:', JSON.stringify(error));
            setUploadStatus({
                type: 'error',
                message: `Failed: ${error.message || error.toString() || 'Unknown error'}`
            });
            setModelStatus('error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="ai-settings">
            <div className="settings-header">
                <Sparkles size={24} />
                <h2>AI Assistant Settings</h2>
            </div>

            <div className="model-status">
                <div className="status-label">Model Status:</div>
                <div className={`status-badge ${modelStatus}`}>
                    {modelStatus === 'loading' && 'Checking...'}
                    {modelStatus === 'ready' && '✓ Ready'}
                    {modelStatus === 'error' && '✗ Not Loaded'}
                </div>
            </div>

            <div className="settings-section model-upload-section">
                <label className="setting-label">
                    📁 Upload AI Model
                    <span className="setting-description">
                        Tap the button below to select a model file from your device's Downloads or Files app
                    </span>
                </label>
                
                <button 
                    className="upload-button" 
                    onClick={handleModelUpload}
                    disabled={uploading}
                >
                    <Upload size={20} />
                    {uploading ? 'Processing...' : 'Select Model File from Device'}
                </button>

                {uploadStatus && (
                    <div className={`upload-status ${uploadStatus.type}`}>
                        {uploadStatus.type === 'success' ? (
                            <CheckCircle size={18} />
                        ) : (
                            <XCircle size={18} />
                        )}
                        <span>{uploadStatus.message}</span>
                    </div>
                )}

                {modelStatus === 'ready' && (
                    <button 
                        className="save-button" 
                        onClick={async () => {
                            try {
                                setUploadStatus({ type: 'success', message: 'Testing model...' });
                                const response = await aiService.generateResponse('Say hello in one sentence');
                                setUploadStatus({ 
                                    type: 'success', 
                                    message: `✅ Model works! Response: "${response.substring(0, 100)}..."` 
                                });
                            } catch (error: any) {
                                setUploadStatus({ 
                                    type: 'error', 
                                    message: `Test failed: ${error.message}` 
                                });
                            }
                        }}
                        style={{ marginBottom: '1rem' }}
                    >
                        <Sparkles size={18} />
                        Test Model
                    </button>
                )}

                <div className="model-info-box">
                    <p><strong>📋 Instructions:</strong></p>
                    <ol style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', fontSize: '0.875rem' }}>
                        <li>Download a MediaPipe model file (.task) to your phone</li>
                        <li>Tap "Select Model File from Device" above</li>
                        <li>Choose the file from your Downloads or Files app</li>
                        <li>Wait for the upload and initialization to complete</li>
                    </ol>
                    <p><strong>✅ Supported formats:</strong> .task, .bin, .tflite</p>
                    <p><strong>💡 Recommended:</strong> MediaPipe Gemma 2B INT8 model (~2.5GB)</p>
                    <p><strong>🔗 Download from:</strong> <a href="https://ai.google.dev/edge/mediapipe/solutions/genai/llm_inference#models" target="_blank" rel="noopener noreferrer">MediaPipe Models Page</a></p>
                </div>
            </div>

            <div className="settings-section">
                <label className="setting-label">
                    Max Response Length
                    <span className="setting-description">
                        Maximum number of tokens (words) in AI responses
                    </span>
                </label>
                <input
                    type="range"
                    min="128"
                    max="1024"
                    step="64"
                    value={config.maxTokens}
                    onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) })}
                />
                <div className="range-value">{config.maxTokens} tokens</div>
            </div>

            <div className="settings-section">
                <label className="setting-label">
                    Creativity Level
                    <span className="setting-description">
                        Higher values make responses more creative but less predictable
                    </span>
                </label>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={config.temperature}
                    onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                />
                <div className="range-value">{config.temperature.toFixed(1)}</div>
            </div>

            <div className="settings-section">
                <label className="setting-label">
                    System Prompt
                    <span className="setting-description">
                        Instructions that guide the AI's behavior and personality
                    </span>
                </label>
                <textarea
                    className="system-prompt-input"
                    value={config.systemPrompt}
                    onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                    rows={6}
                />
            </div>

            <div className="settings-actions">
                <button className="reset-button" onClick={handleReset}>
                    <RotateCcw size={18} />
                    Reset to Default
                </button>
                <button className="save-button" onClick={handleSave}>
                    <Save size={18} />
                    {saved ? 'Saved!' : 'Save Changes'}
                </button>
            </div>

            <div className="settings-info">
                <p>
                    <strong>Model:</strong> Gemma 3 270M (INT8 quantized)
                </p>
                <p>
                    <strong>Privacy:</strong> All AI processing happens on your device. 
                    No data is sent to external servers.
                </p>
            </div>
        </div>
    );
}
