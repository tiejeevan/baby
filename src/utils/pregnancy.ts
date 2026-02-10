import type { PregnancyConfig } from '../types';
import { differenceInDays, addDays, format, subDays } from 'date-fns';

export const calculatePregnancyDuration = (config: PregnancyConfig, targetDate: Date = new Date()) => {
    const refDate = new Date(config.referenceDate);
    const daysSinceRef = differenceInDays(targetDate, refDate);

    // Calculate total days of pregnancy
    const totalDays = (config.referenceWeeks * 7) + config.referenceDays + daysSinceRef;

    // Validate bounds (0 to 42 weeks)
    if (totalDays < 0) return { weeks: 0, days: 0, totalDays: 0 };

    const weeks = Math.floor(totalDays / 7);
    const days = totalDays % 7;

    return { weeks, days, totalDays };
};

export const getWeekStartDate = (config: PregnancyConfig, weekNumber: number): Date => {
    // Determine the conception date (approximate) or Week 0 start date
    // Current total days = refDays + daysSinceRef
    // Week 0 Start = RefDate - (RefWeeks * 7 + RefDays)

    const refDate = new Date(config.referenceDate);
    const daysAlreadyPassedAtRef = (config.referenceWeeks * 7) + config.referenceDays;
    const week0StartDate = subDays(refDate, daysAlreadyPassedAtRef);

    // Week N start date = Week 0 + (N * 7) days
    return addDays(week0StartDate, weekNumber * 7);
};

export const getWeekEndDate = (config: PregnancyConfig, weekNumber: number): Date => {
    const startDate = getWeekStartDate(config, weekNumber);
    return addDays(startDate, 6);
};

export const getDateRangeForWeek = (config: PregnancyConfig, weekNumber: number): string => {
    const start = getWeekStartDate(config, weekNumber);
    const end = getWeekEndDate(config, weekNumber);

    // Check if years are different
    if (start.getFullYear() !== end.getFullYear()) {
        return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
    }

    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
};
