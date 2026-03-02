<div align="center">

# Pumba Parking Race

**An interactive hand-tracking parking game built for the Pumba Conference**

Park cars into matching spots using just your hands — no controllers needed.

[Play Now](https://pumba-parking-race-ncjx3msq6-almos-projects.vercel.app)

Built with React, MediaPipe Hand Tracking, Three.js & Vite.

</div>

---

## About

Pumba Parking Race is a gesture-controlled arcade game designed for the Pumba Conference. Players stand in front of a webcam and use hand movements to grab cars and park them in the correct spots on a Tel Aviv city map — all within 60 seconds.

No keyboard, no mouse, no controllers. Just your hands.

## How to Play

| Gesture | Action |
|---------|--------|
| Open Hand | Move cursor / hover over cars |
| Closed Fist | Grab and drag a car |
| Release (open hand) | Drop the car into a parking spot |

## Game Modes

- **1 Player** — Park as many cars as you can in 60 seconds
- **2 Players** — Split-screen competition, each player controls one hand on the same camera

## Car Types & Parking Rules

Each player starts with 6 cars (2 of each type):

| Car Type | Color | Fits In |
|----------|-------|---------|
| Small | Gold | Any spot (Small, Family, Large) |
| Family | Cyan | Family or Large spots |
| SUV | Orange | Large spots only |

Match a car to a fitting spot to score a point. Choose wisely — placing a small car in a large spot wastes the bigger space!

## Bonus

A **Bonus Camera** appears randomly during gameplay. Grab it for **+5 points**.

## Game Flow

1. **Tutorial** — Learn the controls, register your name & company
2. **Lobby** — Choose 1P or 2P mode
3. **Countdown** — 3… 2… 1… GO!
4. **Gameplay** — 60 seconds of parking action with background music
5. **Game Over** — Results, winner announcement & confetti

## Admin Panel

Access via `/#admin` (PIN protected).

- Match history with search by player name, company, or contact
- Statistics dashboard (total games, average score, high score)
- CSV export of all game records
- Clear history

## Tech Stack

- **React 19** + **TypeScript**
- **MediaPipe Hands** — Real-time hand landmark detection via webcam
- **React Three Fiber** + **Three.js** — 3D car rendering
- **Framer Motion** — UI animations & transitions
- **Tailwind CSS 4** — Styling
- **Leaflet** — Tel Aviv map background
- **Vite** — Dev server & build tooling

## Getting Started

### Prerequisites

- **Node.js** (v18+)
- A **webcam**
- A modern browser (Chrome recommended for best MediaPipe support)

### Install & Run

```bash
git clone https://github.com/Almog-Arazi/Pumba-Conference-Game---Map.git
cd Pumba-Conference-Game---Map
npm install
npm run dev
```

Open **http://localhost:3000** in your browser and allow camera access.

### Deploy

The game is deployed on Vercel as a static site. To deploy your own:

```bash
npm i -g vercel
vercel --prod
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | TypeScript type checking |

## License

Apache-2.0
