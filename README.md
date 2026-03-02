<div align="center">

# Pumba Parking Race

**An interactive hand-tracking parking game built for the Pumba Conference**

Park cars into matching spots using just your hands — no controllers needed.

Built with React, Three.js, MediaPipe Hand Tracking & Vite.

</div>

---

## How It Works

Players use **real-time hand gestures** captured by a webcam to grab and park cars into the correct spots on a Tel Aviv city map.

| Gesture | Action |
|---------|--------|
| Open Hand | Move cursor / hover over cars |
| Closed Fist | Grab and drag a car |
| Release (open hand) | Drop the car into a parking spot |

## Game Modes

- **1 Player** — Park as many cars as you can in 60 seconds
- **2 Players** — Split-screen competition, each player uses one hand

## Car Types & Parking Rules

| Car Type | Color | Fits In |
|----------|-------|---------|
| Small | Gold | Any spot (Small, Family, Large) |
| Family | Cyan | Family or Large spots |
| SUV | Orange | Large spots only |

Each player starts with 6 cars (2 of each type). Matching a car to its exact spot size scores a point.

## Bonus Items

A **Bonus Camera** appears randomly during gameplay — grab it for **+5 points**.

## Game Flow

1. **Tutorial** — Learn the controls, register your name & company
2. **Lobby** — Choose 1P or 2P mode
3. **Countdown** — 3… 2… 1… GO!
4. **Gameplay** — 60 seconds of parking action
5. **Game Over** — Results, winner announcement & confetti

## Admin Panel

Navigate to `/admin` to access:

- Full match history with search
- Player statistics (total games, average score, high score)
- CSV export of all game records

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** — Dev server & build
- **MediaPipe Hands** — Real-time hand landmark detection
- **React Three Fiber** + **Three.js** — 3D car rendering
- **Framer Motion** — UI animations
- **Tailwind CSS 4** — Styling
- **Leaflet** — Map background
- **Express** — Backend server
- **Better-SQLite3** — Match history persistence

## Getting Started

### Prerequisites

- **Node.js** (v18+)
- A **webcam**

### Install & Run

```bash
git clone https://github.com/Almog-Arazi/Pumba-Conference-Game---Map.git
cd Pumba-Conference-Game---Map
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | TypeScript type checking |

## License

Apache-2.0
