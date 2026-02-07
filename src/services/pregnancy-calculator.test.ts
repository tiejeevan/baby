/**
 * Pregnancy Calculator Test Suite
 * 
 * Run this in browser console to verify calculations
 */

import { calculatePregnancyStatus, getLMPDate, validatePregnancyConfig } from './pregnancy-calculator';
import { format } from 'date-fns';

// Test Case 1: Dec 19, 2024 = 8 weeks 2 days
// Expected LMP: Oct 22, 2024
// Expected Due Date: July 28, 2025
console.log('=== Test Case 1: Dec 19, 2024 = 8w 2d ===');
const testConfig1 = {
    referenceDate: '2024-12-19',
    referenceWeeks: 8,
    referenceDays: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

const lmp1 = getLMPDate(testConfig1);
console.log('LMP Date:', format(lmp1, 'MMM dd, yyyy')); // Should be Oct 22, 2024

const status1 = calculatePregnancyStatus(testConfig1, new Date('2024-12-19'));
console.log('On Dec 19, 2024:', `${status1.weeks}w ${status1.days}d`); // Should be 8w 2d
console.log('Due Date:', status1.dueDate); // Should be July 28, 2025
console.log('Progress:', `${status1.percentComplete}%`); // Should be ~21.4%

// Test current date
const currentStatus1 = calculatePregnancyStatus(testConfig1, new Date('2026-02-07'));
console.log('On Feb 7, 2026:', `${currentStatus1.weeks}w ${currentStatus1.days}d`);
console.log('Progress:', `${currentStatus1.percentComplete}%`);

console.log('\n=== Test Case 2: Today = 12 weeks 0 days ===');
const today = new Date();
const testConfig2 = {
    referenceDate: format(today, 'yyyy-MM-dd'),
    referenceWeeks: 12,
    referenceDays: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

const lmp2 = getLMPDate(testConfig2);
console.log('LMP Date:', format(lmp2, 'MMM dd, yyyy'));

const status2 = calculatePregnancyStatus(testConfig2);
console.log('Current:', `${status2.weeks}w ${status2.days}d`); // Should be 12w 0d
console.log('Due Date:', status2.dueDate);
console.log('Progress:', `${status2.percentComplete}%`); // Should be 30%

// Validation tests
console.log('\n=== Validation Tests ===');
console.log('Valid config:', validatePregnancyConfig(testConfig1)); // Should be null
console.log('Invalid weeks:', validatePregnancyConfig({ ...testConfig1, referenceWeeks: 50 })); // Should show error
console.log('Invalid days:', validatePregnancyConfig({ ...testConfig1, referenceDays: 10 })); // Should show error
console.log('Future date:', validatePregnancyConfig({ ...testConfig1, referenceDate: '2030-01-01' })); // Should show error

export { };
