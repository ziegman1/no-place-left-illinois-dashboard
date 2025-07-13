# Editable Disciple-Making Metrics Implementation

## Overview
This document describes the implementation of editable disciple-making metrics across the No Place Left Illinois Dashboard, ensuring data synchronization between the hover feature and data management dashboard.

## Features Implemented

### 1. Enhanced HoverInfoBox Component
**File**: `src/components/HoverInfoBox.jsx`

#### New Features:
- **Edit Button**: Added for coordinators with appropriate permissions
- **Inline Editing**: All three metrics (disciples, simple churches, legacy churches) are editable
- **Permission-Based Access**: 
  - State coordinators: Can edit all data
  - County coordinators: Can edit county-level data
  - Tract coordinators: Can edit only their assigned tract
- **Save/Cancel Functionality**: Real-time saving with error handling
- **Visual Feedback**: Loading states and error messages

#### Permission Logic:
```javascript
const canEdit = user && (
  user.role === "state" || 
  (user.role === "county" && !isTract) ||
  (user.role === "tract" && isTract && user.tractid === info.tractId)
);
```

### 2. Enhanced Data Management Dashboard
**File**: `src/components/DataManagementPage.jsx`

#### New Features:
- **TractEditModal Component**: Full-featured modal for editing tract data
- **Inline Table Editing**: Edit buttons for each tract row
- **Real-time Updates**: Changes reflect immediately in the table
- **Data Persistence**: All changes are saved to the database

#### Modal Features:
- Form validation for all three metrics
- Population display for context
- Error handling and loading states
- Cancel/Save functionality

### 3. Data Synchronization System
**Files**: `src/components/MapDashboard.jsx`, `src/components/DataManagementPage.jsx`

#### Cross-Component Sync:
- **Event-Driven Updates**: Uses `window.dispatchEvent(new Event('dataChanged'))`
- **Automatic Refresh**: All components listen for data changes
- **Persistent State**: Data survives page refreshes and login/logout

#### Implementation:
```javascript
// Trigger data change
window.dispatchEvent(new Event('dataChanged'));

// Listen for changes
useEffect(() => {
  const handleDataChange = () => {
    fetchData(); // Refresh data
  };
  
  window.addEventListener('dataChanged', handleDataChange);
  return () => window.removeEventListener('dataChanged', handleDataChange);
}, []);
```

### 4. Backend API Integration
**File**: `backend/index.js`

#### API Endpoints:
- `POST /api/tract-data/update`: Updates tract disciple-making metrics
- Proper authentication and authorization
- Database persistence with timestamps

#### Data Structure:
```javascript
{
  tractId: "string",
  discipleMakers: number,
  simpleChurches: number,
  legacyChurches: number
}
```

## User Experience Flow

### For State Coordinators:
1. **Hover Feature**: Can edit any county or tract data directly from the map
2. **Data Management**: Can edit any tract data from the table view
3. **Full Access**: No restrictions on data editing

### For County Coordinators:
1. **Hover Feature**: Can edit county-level data and tract data within their county
2. **Data Management**: Can edit tract data for tracts in their county
3. **Limited Access**: Restricted to their assigned county

### For Tract Coordinators:
1. **Hover Feature**: Can edit only their assigned tract data
2. **Data Management**: Can edit only their assigned tract
3. **Restricted Access**: Limited to their specific tract

## Data Persistence

### Database Schema:
```sql
CREATE TABLE tract_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tract_id TEXT UNIQUE,
  population INTEGER DEFAULT 0,
  disciple_makers INTEGER DEFAULT 0,
  simple_churches INTEGER DEFAULT 0,
  legacy_churches INTEGER DEFAULT 0,
  countyfp TEXT,
  updated_at DATETIME,
  updated_by TEXT
);
```

### Data Flow:
1. **User Input** → Frontend validation
2. **API Call** → Backend validation and database update
3. **Success Response** → Local state update
4. **Event Dispatch** → Notify other components
5. **Component Refresh** → Fetch updated data

## Error Handling

### Frontend:
- Input validation (non-negative numbers)
- Network error handling
- User-friendly error messages
- Loading states during save operations

### Backend:
- Authentication validation
- Authorization checks
- Database error handling
- Proper HTTP status codes

## Security Features

### Authentication:
- JWT token validation
- Session management
- Secure API endpoints

### Authorization:
- Role-based access control
- Scope-based permissions
- Data isolation by user role

## Testing Scenarios

### 1. Basic Editing:
- [ ] Edit disciple-makers count
- [ ] Edit simple churches count
- [ ] Edit legacy churches count
- [ ] Save changes successfully

### 2. Permission Testing:
- [ ] State coordinator can edit all data
- [ ] County coordinator can edit county data
- [ ] Tract coordinator can edit only assigned tract
- [ ] Unauthorized users cannot edit

### 3. Data Synchronization:
- [ ] Changes in hover feature reflect in data management
- [ ] Changes in data management reflect in hover feature
- [ ] Data persists through page refresh
- [ ] Data persists through login/logout

### 4. Error Handling:
- [ ] Invalid input handling
- [ ] Network error handling
- [ ] Permission error handling
- [ ] Database error handling

## Future Enhancements

### Potential Improvements:
1. **Bulk Editing**: Allow editing multiple tracts at once
2. **Data Export**: Export edited data to CSV/Excel
3. **Audit Trail**: Track all changes with timestamps
4. **Real-time Collaboration**: Multiple users editing simultaneously
5. **Advanced Validation**: Business rule validation
6. **Offline Support**: Cache data for offline editing

## Technical Notes

### Performance Considerations:
- Event listeners are properly cleaned up
- API calls are debounced where appropriate
- Database queries are optimized
- Frontend state is efficiently managed

### Browser Compatibility:
- Modern browsers with ES6+ support
- Responsive design for mobile devices
- Accessibility considerations

### Data Integrity:
- All changes are validated before saving
- Database transactions ensure consistency
- Rollback mechanisms for failed operations 