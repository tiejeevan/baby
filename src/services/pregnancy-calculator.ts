import { differenceInDays, addDays, format, parseISO } from 'date-fns';
import type { PregnancyConfig, CurrentPregnancyStatus } from '../types';

/**
 * Robust pregnancy calculator based on reference date system
 * 
 * How it works:
 * 1. User provides a reference date when they knew their exact pregnancy progress
 * 2. We calculate the Last Menstrual Period (LMP) date from that reference
 * 3. All calculations are based on LMP (standard medical practice)
 * 4. Pregnancy is measured from LMP, not conception
 * 
 * Example: Dec 19, 2024 = 8 weeks 2 days
 * - This means on Dec 19, 2024, the pregnancy was 8w2d from LMP
 * - We calculate backwards to find LMP: Dec 19 - (8 weeks + 2 days) = Oct 22, 2024
 * - Due date is LMP + 280 days (40 weeks)
 */

/**
 * Calculate current pregnancy status based on reference date and weeks/days
 */
export function calculatePregnancyStatus(
    config: PregnancyConfig,
    currentDate: Date = new Date()
): CurrentPregnancyStatus {
    const referenceDate = parseISO(config.referenceDate);

    // Step 1: Calculate total days pregnant at reference point
    const referenceTotalDays = config.referenceWeeks * 7 + config.referenceDays;

    // Step 2: Calculate the Last Menstrual Period (LMP) date
    // LMP is the reference date minus the pregnancy progress at that time
    const lmpDate = addDays(referenceDate, -referenceTotalDays);

    // Step 3: Calculate current pregnancy progress from LMP
    const currentTotalDays = differenceInDays(currentDate, lmpDate);

    // Step 4: Convert total days to weeks and days
    const weeks = Math.floor(currentTotalDays / 7);
    const days = currentTotalDays % 7;

    // Step 5: Calculate due date (LMP + 280 days = 40 weeks)
    const dueDate = addDays(lmpDate, 280);

    // Step 6: Calculate percentage complete (based on 280 days / 40 weeks)
    // Cap at 100% for pregnancies past due date
    const percentComplete = Math.min((currentTotalDays / 280) * 100, 100);

    return {
        weeks,
        days,
        totalDays: currentTotalDays,
        dueDate: format(dueDate, 'yyyy-MM-dd'),
        percentComplete: Math.round(percentComplete * 10) / 10, // Round to 1 decimal
    };
}

/**
 * Get pregnancy week and day for a specific date
 */
export function getPregnancyWeekForDate(
    config: PregnancyConfig,
    targetDate: Date
): { weeks: number; days: number } {
    const status = calculatePregnancyStatus(config, targetDate);
    return {
        weeks: status.weeks,
        days: status.days,
    };
}

/**
 * Format pregnancy status as readable string
 */
export function formatPregnancyStatus(status: CurrentPregnancyStatus): string {
    return `${status.weeks} weeks ${status.days} days`;
}

/**
 * Get trimester based on weeks
 * First trimester: 0-13 weeks
 * Second trimester: 14-27 weeks
 * Third trimester: 28-40+ weeks
 */
export function getTrimester(weeks: number): 1 | 2 | 3 {
    if (weeks <= 13) return 1;
    if (weeks <= 27) return 2;
    return 3;
}

/**
 * Calculate days until due date
 */
export function getDaysUntilDue(dueDate: string, currentDate: Date = new Date()): number {
    const due = parseISO(dueDate);
    return differenceInDays(due, currentDate);
}

/**
 * Get week range dates (for calendar highlighting)
 */
export function getWeekRangeDates(weeks: number, config: PregnancyConfig): { start: Date; end: Date } {
    const referenceDate = parseISO(config.referenceDate);
    const referenceTotalDays = config.referenceWeeks * 7 + config.referenceDays;

    // Calculate LMP
    const lmpDate = addDays(referenceDate, -referenceTotalDays);

    // Calculate start and end of the specified week
    const weekStartDays = (weeks - 1) * 7;
    const start = addDays(lmpDate, weekStartDays);
    const end = addDays(start, 6);

    return { start, end };
}

/**
 * Validate pregnancy configuration
 * Returns error message if invalid, null if valid
 */
export function validatePregnancyConfig(
    config: Pick<PregnancyConfig, 'referenceDate' | 'referenceWeeks' | 'referenceDays'>
): string | null {
    // Check if reference date is valid
    const referenceDate = parseISO(config.referenceDate);
    if (isNaN(referenceDate.getTime())) {
        return 'Invalid reference date';
    }

    // Check if reference date is not in the future
    if (referenceDate > new Date()) {
        return 'Reference date cannot be in the future';
    }

    // Check weeks range (0-42 weeks is reasonable)
    if (config.referenceWeeks < 0 || config.referenceWeeks > 42) {
        return 'Weeks must be between 0 and 42';
    }

    // Check days range (0-6)
    if (config.referenceDays < 0 || config.referenceDays > 6) {
        return 'Days must be between 0 and 6';
    }

    // Check if the calculated LMP is reasonable (not more than 50 weeks ago from reference)
    const referenceTotalDays = config.referenceWeeks * 7 + config.referenceDays;
    if (referenceTotalDays > 350) { // ~50 weeks
        return 'Pregnancy progress seems too far along. Please check your reference data.';
    }

    return null;
}

/**
 * Get LMP date from configuration (useful for debugging)
 */
export function getLMPDate(
    config: Pick<PregnancyConfig, 'referenceDate' | 'referenceWeeks' | 'referenceDays'>
): Date {
    const referenceDate = parseISO(config.referenceDate);
    const referenceTotalDays = config.referenceWeeks * 7 + config.referenceDays;
    return addDays(referenceDate, -referenceTotalDays);
}
