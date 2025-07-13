# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
# No Place Left Illinois Dashboard

A web-based dashboard for tracking disciple-making efforts across Illinois counties and census tracts.

## Data Sources and Structure

### Population Data
- **Source**: All population data is derived from GeoJSON files located in the `public/` directory
- **Files**: 
  - `simplified_illinois_counties.geojson` - County-level population data
  - `fixed_tracts.geojson` - Tract-level population data
- **Fallback**: The system reads population from multiple property fields in order of preference:
  1. `POP_2020` (2020 Census data)
  2. `population` (generic population field)
  3. `POPULATION` (alternative population field)
  4. `POP2010` (2010 Census data as fallback)

### Disciple-Making Metrics
All disciple-making metrics begin at zero and are updated through user input:

- **Disciple-Makers**: Number of active disciple-makers in the area
- **Simple Churches**: Number of simple/organic churches
- **Legacy Churches**: Number of traditional churches

### "Far from God" Calculation
- **Starting Point**: 85% of the population is considered "far from God"
- **Formula**: `(population * 0.85) - discipleMakers = peopleFarFromGod`
- **Percentage**: `(peopleFarFromGod / population) * 100 = percentFarFromGod`
- **Adjustment**: As disciple-makers increase, the percentage decreases proportionally

### Data Integrity
The system ensures data integrity through:

1. **Population Data Sync**: State coordinators can sync population data from GeoJSON files to the database using the "Sync Population Data" button in the Admin section
2. **Frontend Validation**: Population data is always read from GeoJSON files in the frontend components
3. **Database Defaults**: All disciple-making metrics default to 0 in the database schema
4. **Real-time Calculation**: "Far from God" percentages are calculated in real-time based on current disciple-maker counts

## Features

- Interactive county and tract-level maps
- Real-time disciple-making progress tracking
- Coordinator management system
- Data export and management tools
- Role-based access control (State, County, Tract coordinators)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Start the backend server:
   ```bash
   cd backend
   npm install
   node index.js
   ```

## Usage

1. **State Coordinators**: Can access all data, manage coordinators, and sync population data
2. **County Coordinators**: Can manage tract coordinators and data within their county
3. **Tract Coordinators**: Can update disciple-making data for their assigned tract

## Data Management

- Use the "Sync Population Data" button to ensure population data is current
- All disciple-making metrics start at zero and are updated through the interface
- The system automatically calculates "far from God" percentages based on the 85% starting point
