# Massage App

A complete massage booking and session management app with persistent storage, points system, and payment confirmation.

## Features

- **No Login Required**: Data persists on the device/browser using IndexedDB
- **Massage Sessions**: Choose from preset durations (5-30 minutes) or create custom durations (30 seconds to 30 minutes)
- **Real-time Timer**: Accurate countdown with session recovery after page refresh or browser close
- **Payment System**: Password-protected payment confirmation (password: `jjaakkeelol`)
- **Points System**: Earn 1 point per minute of paid massage
- **Free Massages**: Redeem points for free massages (5 min = 30 points, 10 min = 60 points, 15 min = 90 points)
- **History Tracking**: Separate paid and free massage history with timestamps
- **Statistics**: Total massage time, money spent, paid/free time breakdown
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern Dark Theme**: Dark purple/blue color scheme with red and green accents

## File Structure

```
2TestMassage/
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # Modern responsive CSS
└── js/
    ├── storage.js      # IndexedDB storage manager
    ├── sessions.js     # Session management with timer recovery
    ├── points.js       # Points system
    ├── history.js      # History tracking
    ├── totals.js       # Statistics calculation
    ├── ui.js           # UI management
    └── app.js          # Main app controller
```

## Technology

- **Storage**: IndexedDB with versioning for long-term persistence
- **Timer**: Timestamp-based calculation for accuracy across page refreshes
- **Styling**: Modern CSS with gradients, animations, and responsive design
- **No Backend**: Pure client-side application, works as static website

## Usage

1. Open `index.html` in a web browser
2. Select a massage duration or use the custom slider
3. Click to start a session
4. Timer runs with real-time countdown
5. Finish session and confirm payment (for paid massages)
6. Earn points and view history

## Pricing

- **Preset Massages**: 5 min = ฿10, 10 min = ฿20, 15 min = ฿30, 20 min = ฿40, 25 min = ฿50, 30 min = ฿60
- **Custom Massages**: 30 seconds = ฿1, 1 minute = ฿2 (proportional pricing)
- **Free Massages**: Unlockable with points (5 min = 30 points, 10 min = 60 points, 15 min = 90 points)

## Persistence

Data survives:
- Tab closure
- Browser closure
- Page refresh
- Computer restart
- Extended periods of inactivity

Data is tied to the browser/device and can be cleared if the user clears browser data.

## Payment Password

The payment confirmation password is: `jjaakkeelol`

Note: This is a client-side password for simple confirmation, not bank-level security.

## Deployment

Can be deployed to GitHub Pages or any static hosting service. All paths are relative.

## Browser Compatibility

Requires modern browser with IndexedDB support (Chrome, Firefox, Safari, Edge).
