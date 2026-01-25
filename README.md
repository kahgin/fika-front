# Fika Web

<img width="1910" height="915" alt="screenshot" src="https://github.com/user-attachments/assets/e1b21a44-a041-4d15-a2de-d86d52693353" />
Web app for Fika — an personalised travel itinerary planner.

> [!NOTE]
> Pair this with [Fika Core](https://github.com/kahgin/fika-core) to enable the backend API.

## Features
- Itinerary generation based on user preferences and personal restrictions, including pacing and dietary requirements
- Constraint-aware itinerary planning that accounts for daily start and end times, meal scheduling, and multi-city travel
- Pre-selection of places to visit and accommodation before itinerary generation
- Drag-and-drop itinerary planner for fine-grained adjustments

## Demo
<img width="fit" alt="demo" src="https://github.com/user-attachments/assets/525603ef-e42b-4922-9ec7-51ac5bc50fd1" />

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
```

Fill in your Google Maps API key in `.env`.

### 3. Start the local server

```bash
npm run dev
```
