/**
 * OCR Usage Examples for Pregnancy Tracker App
 * 
 * This file shows practical examples of how to use OCR
 * in different scenarios within your pregnancy app.
 */

import { useState } from 'react';
import OcrPlugin from '../plugins/ocr-plugin';

// Example 1: Scan Medical Report for Due Date
export const ScanDueDateExample = () => {
    const [dueDate, setDueDate] = useState<string>('');

    const scanMedicalReport = async () => {
        const result = await OcrPlugin.scanTextFromCamera();
        
        if (result.success) {
            // Extract date patterns (MM/DD/YYYY or Month DD, YYYY)
            const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4})|([A-Z][a-z]+ \d{1,2},? \d{4})/g;
            const dates = result.text.match(datePattern);
            
            if (dates && dates.length > 0) {
                setDueDate(dates[0]);
                console.log('Found due date:', dates[0]);
            }
        }
    };

    return (
        <div>
            <button onClick={scanMedicalReport}>
                📄 Scan Medical Report
            </button>
            {dueDate && <p>Due Date: {dueDate}</p>}
        </div>
    );
};

// Example 2: Scan Prescription Label
export const ScanPrescriptionExample = () => {
    const [medication, setMedication] = useState<{
        name: string;
        dosage: string;
        instructions: string;
    } | null>(null);

    const scanPrescription = async () => {
        const result = await OcrPlugin.scanTextFromGallery();
        
        if (result.success && result.blocks) {
            // Extract medication info from text blocks
            const lines = result.blocks.map(b => b.text);
            
            setMedication({
                name: lines[0] || '',
                dosage: lines.find(l => l.includes('mg') || l.includes('tablet')) || '',
                instructions: lines.find(l => l.toLowerCase().includes('take')) || ''
            });
        }
    };

    return (
        <div>
            <button onClick={scanPrescription}>
                💊 Scan Prescription
            </button>
            {medication && (
                <div>
                    <p><strong>Name:</strong> {medication.name}</p>
                    <p><strong>Dosage:</strong> {medication.dosage}</p>
                    <p><strong>Instructions:</strong> {medication.instructions}</p>
                </div>
            )}
        </div>
    );
};

// Example 3: Scan Appointment Card
export const ScanAppointmentExample = () => {
    const [appointment, setAppointment] = useState<{
        date: string;
        time: string;
        doctor: string;
    } | null>(null);

    const scanAppointmentCard = async () => {
        const result = await OcrPlugin.scanTextFromCamera();
        
        if (result.success) {
            const text = result.text;
            
            // Extract date
            const dateMatch = text.match(/\d{1,2}\/\d{1,2}\/\d{4}/);
            
            // Extract time
            const timeMatch = text.match(/\d{1,2}:\d{2}\s?(AM|PM)/i);
            
            // Extract doctor name (usually starts with "Dr.")
            const doctorMatch = text.match(/Dr\.\s+[A-Z][a-z]+\s+[A-Z][a-z]+/);
            
            setAppointment({
                date: dateMatch ? dateMatch[0] : '',
                time: timeMatch ? timeMatch[0] : '',
                doctor: doctorMatch ? doctorMatch[0] : ''
            });
        }
    };

    return (
        <div>
            <button onClick={scanAppointmentCard}>
                📅 Scan Appointment Card
            </button>
            {appointment && (
                <div>
                    <p><strong>Date:</strong> {appointment.date}</p>
                    <p><strong>Time:</strong> {appointment.time}</p>
                    <p><strong>Doctor:</strong> {appointment.doctor}</p>
                </div>
            )}
        </div>
    );
};

// Example 4: Scan Nutrition Label
export const ScanNutritionExample = () => {
    const [nutrition, setNutrition] = useState<{
        calories: string;
        protein: string;
        calcium: string;
        iron: string;
    } | null>(null);

    const scanNutritionLabel = async () => {
        const result = await OcrPlugin.scanTextFromGallery();
        
        if (result.success) {
            const text = result.text.toLowerCase();
            
            // Extract nutritional values
            const caloriesMatch = text.match(/calories[:\s]+(\d+)/i);
            const proteinMatch = text.match(/protein[:\s]+(\d+\.?\d*)\s?g/i);
            const calciumMatch = text.match(/calcium[:\s]+(\d+\.?\d*)\s?mg/i);
            const ironMatch = text.match(/iron[:\s]+(\d+\.?\d*)\s?mg/i);
            
            setNutrition({
                calories: caloriesMatch ? caloriesMatch[1] : 'N/A',
                protein: proteinMatch ? proteinMatch[1] + 'g' : 'N/A',
                calcium: calciumMatch ? calciumMatch[1] + 'mg' : 'N/A',
                iron: ironMatch ? ironMatch[1] + 'mg' : 'N/A'
            });
        }
    };

    return (
        <div>
            <button onClick={scanNutritionLabel}>
                🥗 Scan Nutrition Label
            </button>
            {nutrition && (
                <div>
                    <p><strong>Calories:</strong> {nutrition.calories}</p>
                    <p><strong>Protein:</strong> {nutrition.protein}</p>
                    <p><strong>Calcium:</strong> {nutrition.calcium}</p>
                    <p><strong>Iron:</strong> {nutrition.iron}</p>
                </div>
            )}
        </div>
    );
};

// Example 5: Generic Text Scanner with Line Detection
export const GenericScannerExample = () => {
    const [textBlocks, setTextBlocks] = useState<string[]>([]);

    const scanWithLineDetection = async () => {
        const result = await OcrPlugin.scanTextFromCamera();
        
        if (result.success && result.blocks) {
            // Extract all text blocks
            const blocks = result.blocks.map(block => block.text);
            setTextBlocks(blocks);
        }
    };

    return (
        <div>
            <button onClick={scanWithLineDetection}>
                📝 Scan Text
            </button>
            {textBlocks.length > 0 && (
                <ul>
                    {textBlocks.map((text, i) => (
                        <li key={i}>{text}</li>
                    ))}
                </ul>
            )}
        </div>
    );
};
