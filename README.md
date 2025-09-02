# MyFinances - Personal Finance Tracker

A React-based personal finance tracking application with Google Apps Script backend. Features Google SSO authentication, clean architecture separation, and advanced financial reporting capabilities.

![MyFinances Dashboard](https://img.shields.io/badge/Version-2.0.0-blue.svg)
![React](https://img.shields.io/badge/React-18.0-blue.svg)
![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-Backend-green.svg)
![Google SSO](https://img.shields.io/badge/Authentication-Google%20SSO-red.svg)

## 🚀 Latest Updates (September 2025)

### ✨ Major Authentication Overhaul
- **Google SSO Integration**: Migrated from API key to Google authentication
- **Permissions-Based Access**: Access control managed through Google Sheets sharing
- **Clean Architecture**: Separated authentication and API backends
- **Native Google Popup**: Uses Google's default authentication (no custom UI)
- **Two-URL Setup**: Separate endpoints for authentication and data operations

## Features

### 🔐 Authentication & Security
- **Google SSO Authentication**: Secure login using Google accounts
- **Spreadsheet Access Control**: Access managed through Google Sheets permissions
- **Clean Architecture**: Separated authentication and API concerns
- **Native Google Experience**: Uses Google's default authentication popup
- **Persistent Sessions**: One-time URL setup with automatic authentication

### 📊 Dashboard Analytics
- Financial KPI calculations (spending, income, net flow, transaction count)
- Chart.js visualizations for spending trends and category analysis
- Payment method breakdown with pie charts
- Time-based spending pattern analysis

### 📅 Calendar View
- Date-based transaction browsing interface
- Category assignment and modification capabilities
- Daily transaction summaries
- Transaction density indicators

### 📈 Reports
- Multi-criteria filtering system (date range, banks, payment methods, transaction types)
- Server-side filtering for optimal performance
- Sortable transaction tables with column-based sorting
- Category and payment method distribution analysis
- Export capabilities for filtered datasets

### 🏷️ Transaction Management
- Automated transaction type detection and categorization
- Internal transfer identification and exclusion algorithms
- Custom category creation and management
- Editable transaction tags with persistent storage
- Cross-device category synchronization via Google Sheets

## Google Apps Script Integration

This application uses Google Apps Script with a **clean two-backend architecture**.

### 🏗️ Architecture Design

The system implements a **separated architecture** for better maintainability:

```
Frontend (React) ←→ Auth Backend ←→ Google Authentication
                 ↘                      ↙
                  → API Backend ←→ Google Sheets (Database)
                         ↑              ↑
                  - API Endpoints  - Data Storage  
                  - Business Logic - User Preferences
                  - Data Processing- Transaction Data
                  - Caching       - Custom Categories
```

### 📁 Backend Structure

#### 🔐 backend-auth.gs (Authentication Only)
**Pure Google authentication with native popup**

```javascript
function doGet(e) {
  // This automatically triggers Google's native login if user isn't authenticated
  const user = Session.getActiveUser();
  const email = user.getEmail();
  
  // Check spreadsheet access permissions
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];
    sheet.getRange(1, 1, 1, 1).getValues(); // Test access
    
    // Return clean JSON response
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      user: { email, name: email.split('@')[0], timestamp: Date.now() }
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: `Access denied. Please ask the sheet owner to share it with ${email}.`
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

#### 📊 backend-api.gs (Data Operations Only)
**Pure API with all data operations**

```javascript
function doGet(e) {
  // Handle all API actions
  switch (e.parameter.action) {
    case 'getTransactions': 
      return createJsonpResponse(getTransactions_(e.parameter), e.parameter.callback);
    case 'getSummary': 
      return createJsonpResponse(getSummary_(e.parameter), e.parameter.callback);
    case 'setTransactionTag': 
      return createJsonpResponse(setTransactionTag_(e.parameter), e.parameter.callback);
    // Additional endpoints...
  }
}
```

### 🎯 Key Benefits of Separation

1. **Clean Architecture**: Each backend has a single, clear responsibility
2. **Better Security**: Can configure different access levels if needed
3. **Easier Deployment**: Deploy each script separately with appropriate permissions
4. **Maintainability**: Changes to auth don't affect API and vice versa
5. **Scalability**: Can potentially use different Google Apps Script projects

### ⚡ Performance Optimizations

#### Server-Side Filtering
```javascript
function getTransactions_(params) {
  let data = getAllTransactions();
  
  // Date range filtering on server
  if (params.startDate && params.endDate) {
    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);
    data = data.filter(r => {
      const txnDate = new Date(r.Timestamp);
      return txnDate >= startDate && txnDate <= endDate;
    });
  }
  
  // Additional server-side filtering...
  return data;
}
```

#### Intelligent Batching
```javascript
// Handle large datasets with automatic batching
const batchSize = parseInt(params.batchSize) || 0;
if (batchSize > 0) {
  const startIndex = batchNumber * batchSize;
  const endIndex = startIndex + batchSize;
  return {
    transactions: data.slice(startIndex, endIndex),
    totalCount: data.length,
    hasMore: endIndex < data.length
  };
}
```

#### Advanced Caching
```javascript
const cache = CacheService.getScriptCache();
const CACHEABLE_ACTIONS = ['getSummary', 'getFilterOptions', 'getTransactions'];

if (CACHEABLE_ACTIONS.includes(action)) {
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);
}
```

## Installation & Setup

### Prerequisites

- Node.js 18 or higher
- Google Account with Sheets and Apps Script access
- Transaction data in supported format

### 🔧 Setup Process

#### 1. Frontend Installation

```bash
git clone https://github.com/mubaraknumann/MyFinances.git
cd MyFinances
npm install
npm run dev
```

#### 2. Backend Deployment

**Deploy Authentication Backend:**
1. Create new Google Apps Script project at script.google.com
2. Copy `backend-auth.gs` content
3. Update `SPREADSHEET_ID` with your Google Sheet ID
4. Deploy as Web App: Execute as "Me", Access "Anyone"
5. Copy the deployment URL (Authentication URL)

**Deploy API Backend:**
1. Create another Google Apps Script project (or use separate file in same project)
2. Copy `backend-api.gs` content  
3. Update `SPREADSHEET_ID` with your Google Sheet ID
4. Deploy as Web App: Execute as "Me", Access "Anyone"
5. Copy the deployment URL (API URL)

#### 3. Google Sheets Preparation

Create Google Sheet with required columns:
```
A: Transaction_ID      (Unique identifier)
B: Timestamp          (Date: YYYY-MM-DD HH:MM:SS)
C: Bank               (Bank name)
D: Account_Identifier (Account number/identifier)
E: Transaction_Method (UPI, Card, NEFT, etc.)
F: Debit_Credit       (Either "Debit" or "Credit")
G: Amount             (Numeric amount)
H: Recipient_Merchant (Merchant/Recipient name)
I: Raw_Message        (Optional: Original bank message)
```

#### 4. Application Setup

1. Access application at http://localhost:3000
2. Enter **Authentication URL** (from backend-auth.gs deployment)
3. Enter **API URL** (from backend-api.gs deployment)
4. Click "Save & Continue with Google"
5. Google's native authentication popup will appear
6. Grant permissions for Google Sheets access
7. Verify connection to your financial data

### 🔐 Access Control

Access is managed through **Google Sheets sharing permissions**:

1. Share your Google Sheet with users who need access
2. Users authenticate with their Google accounts
3. System verifies they have access to the shared sheet
4. No additional user management required

## 🎨 User Experience

### Authentication Flow
1. **One-Time Setup**: Enter Authentication URL and API URL
2. **Native Google Login**: Click button → Google's default popup appears
3. **Automatic Access Check**: System verifies sheet permissions
4. **Seamless Experience**: Subsequent logins are automatic

### URL Management
- URLs saved permanently in localStorage
- Settings panel allows viewing current URLs
- "Clear All Data" option for complete reset
- No need to re-enter URLs unless changing backends

## Configuration

### Transaction Classification

Modify filtering logic in `src/utils/transactionFilters.js`:

```javascript
// Internal transfer detection
const timeWindowMs = 5 * 60 * 1000; // 5 minutes

// User's banks for transfer detection
const userBanks = [
  'axis bank', 'hdfc bank', 'hsbc', 'icici bank', 'idfc first bank'
];

// Bill payment patterns
const billPatterns = [
  'electricity', 'gas', 'water', 'internet', 'mobile', 'phone',
  'insurance', 'premium', 'utility', 'bill', 'recharge'
];
```

### Custom Categories

Default categories in `src/utils/transactionTags.js`:

```javascript
const DEFAULT_CATEGORIES = [
  'Food & Dining', 'Shopping', 'Entertainment', 'Transport',
  'Bills & Utilities', 'Healthcare', 'Travel', 'Education',
  'Investment', 'Internal Transfer', 'Other'
];
```

## 📂 Project Structure

```
MyFinances/
├── src/
│   ├── components/          # UI components
│   │   ├── AuthGate.jsx    # ✨ Updated: Google SSO with two URLs
│   │   ├── Layout.jsx      # Application layout
│   │   ├── TransactionTags.jsx # Tag management
│   │   └── CategoryModal.jsx # Category editor
│   ├── pages/              # Route components
│   │   ├── Dashboard.jsx   # Financial dashboard
│   │   ├── Transactions.jsx # Transaction management
│   │   └── Reports.jsx     # Reporting interface
│   ├── services/           # External integrations
│   │   └── api.js         # ✨ Updated: Works with separate API URL
│   └── utils/             # Utility functions
│       ├── transactionFilters.js # Transaction processing
│       ├── transactionTags.js    # Categorization logic
│       └── categoryManager.js    # Category management
├── backend-auth.gs         # ✨ NEW: Pure authentication backend
├── backend-api.gs          # ✨ NEW: Pure API backend
├── backend-unified.gs      # ⚠️ DEPRECATED: Old unified approach
└── package.json           # Dependencies and scripts
```

## 🚀 Development Commands

```bash
npm run dev      # Development server (http://localhost:3000)
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Code linting
```

## 🔧 Advanced Features

### Transaction Tagging System
- **Automated Classification**: Spending, Income, Internal Transfer, Bill Payment
- **Editable Tags**: Click-to-edit dropdown interface
- **Persistent Storage**: Tags saved to Google Sheets "Transaction Tags" sheet
- **Real-time Updates**: Changes reflected immediately in UI

### Internal Transfer Detection
- **Paired Transaction Analysis**: Matches opposite amounts within time windows
- **Multi-Bank Support**: Handles transfers between different user accounts
- **Smart Exclusion**: Avoids marking legitimate expenses as transfers

### Performance Optimizations
- **Server-Side Filtering**: Filtering happens on Google Apps Script server
- **Intelligent Batching**: Automatic handling of large datasets
- **Advanced Caching**: Multi-layer caching with 2-minute duration
- **Hybrid Architecture**: Fallback to client-side when needed

## Troubleshooting

### Common Issues

**Authentication Problems**
```
Error: Authentication failed
Solution: 
- Ensure Google Sheets is shared with your account
- Check that backend-auth.gs is deployed correctly
- Verify Authentication URL is correct
- Try clearing browser cache and localStorage
```

**API Connection Issues**
```
Error: Could not connect to API
Solution:
- Verify API URL is correct and backend-api.gs is deployed
- Check that both scripts have the same SPREADSHEET_ID
- Test API URL directly in browser
- Ensure Google Apps Script execution policy allows public access
```

**Data Loading Problems**
```
Error: No transactions found
Solution:
- Verify Google Sheet column headers match required format
- Confirm SPREADSHEET_ID in both backend scripts
- Check data format consistency
- Ensure user has read access to the sheet
```

### Debug Mode

Enable detailed logging:

```javascript
// In src/services/api.js
console.log('API request:', action, params);

// In Google Apps Script
Logger.log(`Processing ${action} with params:`, params);
```

## Deployment

### Frontend Deployment Options

#### Vercel
```bash
npm i -g vercel
vercel
# No environment variables needed - URLs configured at runtime
```

#### Netlify
```bash
npm run build
# Deploy dist/ folder to Netlify
# No build-time configuration required
```

#### GitHub Pages
```bash
npm install --save-dev gh-pages
npm run build
npx gh-pages -d dist
```

### Production Considerations

1. **Backend URLs**: Use production Google Apps Script URLs
2. **HTTPS**: Ensure both auth and API backends use HTTPS
3. **Access Control**: Configure Google Sheet sharing appropriately
4. **Performance**: Enable caching in Google Apps Script
5. **Monitoring**: Set up Google Apps Script execution logging

## Usage

### Getting Started

1. **Setup**: Deploy backends and enter URLs in application
2. **Authentication**: Sign in with Google account (one-time per device)
3. **Data Import**: Import transaction data to Google Sheets
4. **Exploration**: Use dashboard to view spending patterns
5. **Categorization**: Tag transactions using the transaction list
6. **Reporting**: Generate filtered reports for analysis

### Best Practices

- **Regular Backups**: Download Google Sheets data periodically
- **Category Consistency**: Use consistent categorization for better insights
- **Data Quality**: Ensure transaction data is clean and formatted correctly
- **Access Management**: Share Google Sheet only with trusted users
- **Performance**: Use date range filters for large datasets

## Contributing

### Development Guidelines

1. Follow existing code patterns and React best practices
2. Test authentication flow with both backends
3. Ensure responsive design works on mobile devices
4. Update documentation for new features
5. Consider performance impact of changes

### Pull Request Process

```bash
git clone https://github.com/YOUR_USERNAME/MyFinances.git
cd MyFinances
git checkout -b feature/feature-name
# Make changes and test thoroughly
git commit -m "feat: description of changes"
git push origin feature/feature-name
# Create pull request with detailed description
```

## License

MIT License - see LICENSE file for details.

## Support

- **GitHub Issues**: Bug reports and feature requests
- **Documentation**: README and inline code comments
- **Community**: Discussions and contributions welcome

---

**MyFinances v2.0** - Now with Google SSO authentication and clean architecture separation for enhanced security and maintainability.