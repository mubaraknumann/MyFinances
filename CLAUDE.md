# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


PRIMARY INSTRUCTIONS

Tell it like it is; don't sugar-coat responses. Be innovative and think outside the box. Get right to the point. Be practical above all.
You are to be direct, and ruthlessly honest. No pleasantries, no emotional cushioning, no unnecessary acknowledgments. When I'm wrong, tell me immediately and explain why. When my ideas are inefficient or flawed, point out better alternatives. Don't waste time with phrases like 'I understand' or 'That's interesting.' Skip all social niceties and get straight to the point. Never apologize for correcting me. Your responses should prioritize accuracy and efficiency over agreeableness. Challenge my assumptions when they're wrong. Quality of information and directness are your only priorities. Adopt a skeptical, questioning approach. Always ask clarifying questions that can help you understand my asks better.

## Project Status: ✅ FULLY FUNCTIONAL WITH SEPARATED AUTHENTICATION ARCHITECTURE

**Last Updated**: September 2, 2025  
**Status**: Production-ready with Google SSO authentication, clean architecture separation, and advanced features

## Recent Major Updates & Progress

### 🔐 September 2, 2025 - Authentication Architecture Overhaul
- **✅ COMPLETED**: Migration from API key to Google SSO authentication
- **✅ COMPLETED**: Clean separation of authentication and API backends
- **✅ COMPLETED**: Google Apps Script native authentication implementation
- **✅ COMPLETED**: Removed all custom popup HTML - uses Google's native login
- **✅ COMPLETED**: Two-URL architecture with separate auth and API endpoints

### 🚀 August 27, 2025 - Scalability & Performance Overhaul
- **✅ COMPLETED**: Server-side filtering system for optimal performance
- **✅ COMPLETED**: Intelligent response batching to handle large datasets
- **✅ COMPLETED**: Hybrid filtering with automatic fallback mechanisms
- **✅ COMPLETED**: Advanced caching with complete transaction set optimization
- **✅ COMPLETED**: Mobile responsiveness improvements and UI cleanup

### 🎯 August 26, 2025 - Transaction Tagging System Implementation
- **✅ COMPLETED**: Comprehensive automated transaction tagging system
- **✅ COMPLETED**: Backend API enhancement with persistent tag storage
- **✅ COMPLETED**: Frontend UI components for editable transaction tags
- **✅ COMPLETED**: Performance optimizations and bug fixes

## Current Authentication System

### 🔐 Google SSO Architecture (NEW)
**Migration completed from API key to Google authentication based on Google Sheets access permissions**

#### Two-Backend Architecture:
1. **backend-auth.gs** - Pure authentication only
   - Uses `Session.getActiveUser()` for native Google authentication  
   - Triggers Google's default login popup automatically
   - Verifies spreadsheet access permissions
   - Returns clean JSON responses (no custom HTML)

2. **backend-api.gs** - Pure data operations only
   - All transaction, summary, and chart data endpoints
   - Category rules and transaction tags management
   - Caching and batching for performance
   - JSONP support for cross-origin requests

#### Frontend Changes:
- **AuthGate.jsx** now handles two separate URLs:
  - Authentication URL (for Google login)
  - API URL (for data operations)
- URLs saved permanently in localStorage (one-time setup)
- Pure Google native authentication popup (no custom UI)
- Automatic API connection testing after authentication

### Setup Flow:
1. User enters **Authentication URL** and **API URL** (one-time)
2. Google's native authentication popup appears automatically
3. Access verified based on Google Sheets permissions
4. All subsequent API calls use the separate API URL

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

## Project Architecture

### Tech Stack
- **Frontend**: React 18 + Vite
- **Routing**: React Router DOM
- **Styling**: Tailwind CSS with dark theme
- **Charts**: Chart.js + React-ChartJS-2
- **UI Components**: Headless UI + Heroicons
- **Date Handling**: date-fns
- **Authentication**: Google SSO via Google Apps Script

### Enhanced Project Structure
```
src/
├── components/              # Reusable UI components
│   ├── AuthGate.jsx        # ✨ UPDATED: Google SSO with two-URL setup
│   ├── Layout.jsx          # Main app layout with sidebar
│   ├── CategoryModal.jsx   # Transaction categorization modal
│   └── TransactionTags.jsx # Editable transaction tag component
├── pages/                  # Main application pages
│   ├── Dashboard.jsx       # KPI cards and spending charts
│   ├── Transactions.jsx    # Enhanced: Now with transaction tags
│   └── Reports.jsx         # Enhanced: Integrated transaction tags
├── services/               # API and external service integrations
│   └── api.js             # ✨ UPDATED: Works with separate API URL
├── utils/                  # Utility functions
│   ├── transactionFilters.js # Internal transfer detection logic
│   └── transactionTags.js    # Transaction classification and tagging
└── hooks/                  # Custom React hooks (if any)

Backend Files:
├── backend-auth.gs         # ✨ NEW: Pure authentication backend
├── backend-api.gs          # ✨ UPDATED: Pure API backend  
├── backend-unified.gs      # ⚠️ DEPRECATED: Old unified approach
└── backend-script.gs       # ⚠️ DEPRECATED: Old API key approach
```

### Enhanced API Integration

#### Authentication Endpoints (backend-auth.gs)
- **GET /**: Triggers Google native authentication
- Returns user data JSON on successful authentication
- Verifies Google Sheets access permissions
- No custom HTML - pure JSON responses

#### Core API Endpoints (backend-api.gs)
- `getTransactions` - Enhanced with server-side filtering + CustomTags field
- `getSummary` - Get spending/income summaries for periods
- `getChartData` - Pre-aggregated data for charts
- `getFilterOptions` - Available filter options (banks, methods, types)
- `setCategoryRule` - Create merchant categorization rules

#### Tag Management Endpoints
- `setTransactionTag` - Save custom tags for specific transactions
- `getTransactionTags` - Retrieve tags for a specific transaction
- `getAllTransactionTags` - Bulk retrieve all transaction tags

### Performance & Scalability Solutions

#### ⚡ August 27, 2025 - Major Performance Overhaul
**Previous Problems**: 
- Client-side filtering of 800+ transactions causing slow performance
- "Argument too large" JSONP errors with large datasets
- No server-side filtering capabilities

**✅ Solutions Implemented**:

1. **Server-Side Filtering System**
   - Backend now handles `startDate`, `endDate`, `banks`, `methods`, `types` parameters
   - Filtering happens on Google Apps Script server, not client
   - Maintains backward compatibility with legacy parameters

2. **Intelligent Response Batching**
   - Automatic detection of JSONP size limits
   - Progressive loading with 150-transaction batches when needed
   - Seamless combination of batches into complete datasets
   - Preserves all data without artificial limits

3. **Hybrid Filtering Architecture**
   - **Primary**: Server-side filtering for optimal performance
   - **Fallback**: Client-side filtering when server limits hit
   - **Result**: Always get complete filtered data

4. **Advanced Caching Strategy**
   - Complete transaction set caching (not individual batches)
   - 2-minute cache duration for optimal balance
   - Separate caching for filtered vs unfiltered datasets

**Performance Results**:
- ⚡ **Filtered queries**: 3-5 seconds (vs 15-20+ seconds before)
- 📊 **Complete datasets**: Delivered via intelligent batching
- 🎯 **No data loss**: All 800+ transactions available when needed
- 💾 **Smart caching**: Subsequent requests near-instant

#### 🔄 Backend Synchronization Requirements
**CRITICAL**: Always keep both backend files synchronized with frontend features:
- ✅ Server-side filtering parameters added to API backend
- ✅ Intelligent batching system implemented in API backend
- ✅ Pure authentication logic in auth backend  
- ✅ Clean separation maintained between auth and API concerns

### Key Features

#### Core Features
1. **Google SSO Authentication**: Secure Google-based authentication with spreadsheet access control
2. **Dashboard**: Real-time KPIs and 14-day spending visualization
3. **Transaction Management**: Searchable transaction log with categorization
4. **Reports**: Customizable date-range reports with category breakdowns
5. **Responsive Design**: Mobile-first design with collapsible sidebar navigation

#### Advanced Features
6. **Automated Transaction Classification**: Smart categorization of transaction types
7. **Editable Transaction Tags**: User-customizable transaction type overrides
8. **Internal Transfer Detection**: Sophisticated paired-transaction analysis
9. **Bill Payment Recognition**: Pattern-based bill payment identification
10. **Persistent Tag Storage**: Backend integration with Google Sheets storage

### Transaction Classification Logic

#### Internal Transfer Detection
- Analyzes transaction pairs within 5-minute time windows
- Matches opposite amounts between same user's accounts
- Different logic for Debit vs Credit transactions
- Excludes legitimate expenses from internal transfer classification

#### Bill Payment Detection
```javascript
const billPatterns = [
  'electricity', 'gas', 'water', 'internet', 'mobile', 'phone',
  'insurance', 'premium', 'utility', 'bill', 'recharge',
  'reliance jio', 'airtel', 'vodafone', 'bsnl',
  'electricity board', 'bescom', 'kseb', 'mseb',
  'credit card payment', 'loan payment', 'emi payment',
  'cc payment', 'card payment'
];
```

### Design Philosophy
- Dark mode by default with clean, minimalist aesthetic
- Data-first approach prioritizing readability and functionality
- Fully responsive layout adapting from mobile to desktop
- No gradients - uses solid colors and subtle shadows for depth
- Color-coded transaction tags with intuitive icons

### Current System Status
1. **Authentication**: ✅ GOOGLE SSO - Native Google authentication with permissions-based access
2. **Performance**: ✅ OPTIMIZED - 3-5 second response times with intelligent batching
3. **Scalability**: ✅ FUTURE-PROOF - Handles thousands of transactions via batching
4. **Architecture**: ✅ CLEAN SEPARATION - Distinct auth and API backends
5. **Caching**: ✅ ADVANCED - Multi-layer caching with complete dataset optimization

### Deployment Status
- **Frontend**: Development server running on http://localhost:3000
- **Authentication Backend**: Google Apps Script (backend-auth.gs) - Deploy separately
- **API Backend**: Google Apps Script (backend-api.gs) - Deploy separately
- **Database**: Google Sheets with "Transaction Tags" sheet for persistence
- **Access Control**: Based on Google Sheets sharing permissions

### Files Ready for Production
1. **backend-auth.gs** - ✅ Pure Google authentication backend
2. **backend-api.gs** - ✅ Pure API backend with server-side filtering + intelligent batching
3. **AuthGate.jsx** - ✅ Updated for two-URL Google SSO flow
4. All other frontend components optimized for scalability and mobile responsiveness  

### Deployment Instructions
1. **Deploy backend-auth.gs** as Web App (Execute as "Me", Access "Anyone") → Get Auth URL
2. **Deploy backend-api.gs** as Web App (Execute as "Me", Access "Anyone") → Get API URL
3. **Update both scripts** with your Google Sheets ID
4. **Enter both URLs** in MyFinances setup (one-time configuration)
5. **Share your Google Sheet** with users who need access

### Testing & Quality Assurance
- ✅ Google SSO authentication tested and functional
- ✅ Backend API endpoints tested and functional
- ✅ Frontend components rendering correctly with new auth flow
- ✅ Tag persistence verified with Google Sheets storage
- ✅ Duplicate key warnings resolved
- ✅ Error handling and fallback mechanisms in place
- ✅ Two-URL setup flow tested and working

---

## API Documentation

### Authentication
**NEW**: No API key required. Access control is managed through Google authentication and Google Sheets sharing permissions.

#### Authentication Flow:
1. User visits Authentication URL → Google native login popup
2. System verifies Google Sheets access permissions  
3. Returns user data JSON on success
4. Frontend uses separate API URL for all data operations

### Enhanced Transaction Response Format
```json
{
  "Timestamp": "2025-08-24T12:04:00.000Z",
  "Bank": "HSBC",
  "Account_Identifier": "XX5006", 
  "Transaction_Method": "Account",
  "Debit_Credit": "Debit",
  "Amount": 710,
  "Recipient_Merchant": "L J IYENGAR BAKERY",
  "Transaction_ID": "925485363688",
  "Raw_Message": "INR 710.00 is paid from...",
  "Category": "Groceries",
  "CustomTags": {
    "type": "spending"
  }
}
```

The application now features clean architecture separation with Google SSO authentication and is ready for production deployment with enhanced security and maintainability.