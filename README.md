# Pregnancy Tracker App

A beautiful, privacy-focused pregnancy tracking app built with React, TypeScript, and Capacitor for Android.

## Features

- 📊 **Progress Tracking**: Track pregnancy by week and day
- 📅 **Timeline**: Record and view pregnancy milestones
- 🗓️ **Calendar**: Month-wise view for daily entries
- ⚙️ **Settings**: Configure pregnancy reference date
- 🔔 **Notifications**: Local reminders (ready for appointments/medications)
- 📱 **Android Ready**: Built with Capacitor for native Android deployment
- 🔒 **Privacy First**: All data stored locally using IndexedDB

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Routing**: React Router v7
- **Database**: Dexie.js (IndexedDB wrapper)
- **Animations**: Framer Motion
- **Mobile**: Capacitor 7
- **Date Utilities**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Android Studio (for Android development)

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Sync with Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

## Project Structure

```
src/
├── components/       # Reusable UI components
├── screens/          # Main app screens
├── services/         # Business logic and data services
├── types/            # TypeScript type definitions
├── styles/           # Global styles and theme
└── data/             # Static data and constants
```

## Reference Date System

The app uses a reference date system for accurate pregnancy tracking:

1. Choose a date when you knew your exact pregnancy progress
2. Enter the weeks and days at that reference date
3. The app automatically calculates your current progress

**Example**: If on December 19, 2024, you were 8 weeks and 2 days pregnant, enter:
- Reference Date: 12/19/2024
- Weeks: 8
- Days: 2

## Development

```bash
# Start dev server
npm run dev

# Type checking
npm run type-check

# Build
npm run build

# Preview production build
npm run preview
```

## Android Build

```bash
# Build web assets
npm run build

# Sync with Capacitor
npx cap sync android

# Open in Android Studio
npx cap open android
```

## License

MIT

## Disclaimer

⚠️ This app is for informational purposes only and should not replace professional medical advice. Always consult with your healthcare provider for medical decisions.
