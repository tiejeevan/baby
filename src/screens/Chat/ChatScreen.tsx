import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Send, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { dbHelpers } from '../../services/database';
import { aiService } from '../../services/ai';
import './ChatScreen.css';

export default function ChatScreen() {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [modelReady, setModelReady] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const messages = useLiveQuery(() => dbHelpers.getChatMessages(), []);

    useEffect(() => {
        initializeAI();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const initializeAI = async () => {
        setIsInitializing(true);
        const ready = await aiService.initialize();
        setModelReady(ready);
        setIsInitializing(false);

        if (!ready) {
            await dbHelpers.addChatMessage({
                role: 'system',
                content: 'AI assistant is currently unavailable. Please try again later.',
                createdAt: new Date().toISOString()
            });
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading || !modelReady) return;

        const userMessage = input.trim();
        setInput('');
        setIsLoading(true);

        try {
            // Save user message
            await dbHelpers.addChatMessage({
                role: 'user',
                content: userMessage,
                createdAt: new Date().toISOString()
            });

            // Get conversation history
            const history = (messages || []).slice(-10).map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            // Generate AI response
            const response = await aiService.generateResponse(userMessage, history);

            // Save AI response
            await dbHelpers.addChatMessage({
                role: 'assistant',
                content: response,
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error sending message:', error);
            await dbHelpers.addChatMessage({
                role: 'system',
                content: 'Sorry, there was an error processing your message.',
                createdAt: new Date().toISOString()
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearChat = async () => {
        if (window.confirm('Are you sure you want to clear all chat history?')) {
            await dbHelpers.clearChatHistory();
        }
    };

    const handleSuggestion = async (topic: 'nutrition' | 'exercise' | 'symptoms' | 'general') => {
        if (isLoading || !modelReady) return;

        setIsLoading(true);
        try {
            const response = await aiService.getSuggestions(topic);
            await dbHelpers.addChatMessage({
                role: 'assistant',
                content: response,
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error getting suggestion:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isInitializing) {
        return (
            <div className="chat-screen">
                <div className="chat-loading">
                    <Loader2 className="spinner" size={48} />
                    <p>Initializing AI assistant...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-screen">
            <div className="chat-header">
                <div className="chat-title">
                    <Sparkles size={24} />
                    <h1>AI Assistant</h1>
                </div>
                {messages && messages.length > 0 && (
                    <button className="clear-button" onClick={handleClearChat}>
                        <Trash2 size={20} />
                    </button>
                )}
            </div>

            <div className="chat-messages">
                {!messages || messages.length === 0 ? (
                    <div className="chat-empty">
                        <Sparkles size={64} className="empty-icon" />
                        <h2>Welcome to your AI Assistant</h2>
                        <p>Ask me anything about your pregnancy journey!</p>
                        
                        <div className="suggestions">
                            <h3>Quick suggestions:</h3>
                            <button onClick={() => handleSuggestion('nutrition')}>
                                Nutrition tips
                            </button>
                            <button onClick={() => handleSuggestion('exercise')}>
                                Safe exercises
                            </button>
                            <button onClick={() => handleSuggestion('symptoms')}>
                                Common symptoms
                            </button>
                            <button onClick={() => handleSuggestion('general')}>
                                What to expect
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`message ${message.role}`}
                            >
                                <div className="message-content">
                                    {message.content}
                                </div>
                                <div className="message-time">
                                    {new Date(message.createdAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            <div className="chat-input-container">
                <input
                    type="text"
                    className="chat-input"
                    placeholder={modelReady ? "Ask me anything..." : "AI assistant unavailable"}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    disabled={isLoading || !modelReady}
                />
                <button
                    className="send-button"
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading || !modelReady}
                >
                    {isLoading ? (
                        <Loader2 className="spinner" size={20} />
                    ) : (
                        <Send size={20} />
                    )}
                </button>
            </div>
        </div>
    );
}
