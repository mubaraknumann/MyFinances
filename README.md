# MyFinances - Personal Finance Tracker

A React-based personal finance tracking application with Google Apps Script backend. Provides transaction analysis, spending categorization, and financial reporting capabilities.

![MyFinances Dashboard](https://img.shields.io/badge/Version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-18.0-blue.svg)
![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-Backend-green.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

## Features

### Dashboard Analytics
- Financial KPI calculations (spending, income, net flow, transaction count)
- Chart.js visualizations for spending trends and category analysis
- Payment method breakdown with pie charts
- Time-based spending pattern analysis

### Calendar View
- Date-based transaction browsing interface
- Category assignment and modification capabilities
- Daily transaction summaries
- Transaction density indicators

### Reports
- Multi-criteria filtering system (date range, banks, payment methods, transaction types)
- Sortable transaction tables with column-based sorting
- Category and payment method distribution analysis
- Export capabilities for filtered datasets

### Transaction Management
- Automated transaction type detection and categorization
- Internal transfer identification and exclusion algorithms
- Custom category creation and management
- Manual classification override system
- Cross-device category synchronization via Google Sheets

### Security
- Environment-based configuration management
- API key authentication system
- Client-side credential storage
- No hardcoded sensitive data

## Google Apps Script Integration

This application uses Google Apps Script as a serverless backend solution.

### Architecture Design

The system implements a three-tier architecture:

```
Frontend (React) ←→ Google Apps Script ←→ Google Sheets (Database)
     ↑                      ↑                     ↑
- User Interface      - API Endpoints      - Data Storage  
- Data Visualization  - Business Logic     - User Preferences
- Local Caching       - Authentication     - Transaction Data
- State Management    - Data Processing    - Custom Categories
```

### Implementation Details

The Google Apps Script backend provides the following functionality:

#### Core API Endpoints

**doGet(e)**: Main request handler
```javascript
function doGet(e) {
  const action = e.parameter.action;
  const apiKey = e.parameter.apiKey;
  
  if (!validateApiKey(apiKey)) {
    return createResponse({ error: 'Invalid API key' });
  }
  
  switch (action) {
    case 'getTransactions': return getTransactions(e.parameter);
    case 'getSummary': return getSummary(e.parameter);
    case 'setTransactionTag': return setTransactionTag(e.parameter);
    // Additional endpoints...
  }
}
```

**getTransactions(filters)**: Data retrieval with server-side filtering
```javascript
function getTransactions(filters) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  const filteredData = data.filter(row => {
    return matchesDateRange(row, filters.startDate, filters.endDate) &&
           matchesBank(row, filters.banks) &&
           matchesMethod(row, filters.methods);
  });
  
  return createResponse({ transactions: filteredData });
}
```

**getSummary(period)**: Financial calculations
```javascript
function getSummary(period) {
  const transactions = getAllTransactions();
  const summary = {
    totalSpending: calculateSpending(transactions, period),
    totalIncome: calculateIncome(transactions, period),
    netFlow: calculateNetFlow(transactions, period),
    transactionCount: transactions.length
  };
  
  return createResponse({ summary });
}
```

**setTransactionTag(id, key, value)**: Metadata management
```javascript
function setTransactionTag(transactionId, tagKey, tagValue) {
  const tagsSheet = getOrCreateSheet('TransactionTags');
  const existingRow = findTagRow(tagsSheet, transactionId, tagKey);
  
  if (existingRow) {
    tagsSheet.getRange(existingRow, 3).setValue(tagValue);
  } else {
    tagsSheet.appendRow([transactionId, tagKey, tagValue, new Date()]);
  }
  
  return createResponse({ success: true });
}
```

#### Data Structure

The system uses multiple sheets within a single Google Spreadsheet:
- **Main Sheet**: Transaction records with standardized column structure
- **TransactionTags**: User-defined classifications and categories
- **CustomCategories**: User-created category definitions
- **UserPreferences**: Application configuration settings

#### Security Implementation

**Authentication**: API key-based request validation
```javascript
const API_KEY = 'user-defined-secure-key';

function validateApiKey(providedKey) {
  return providedKey === API_KEY;
}
```

**CORS Handling**: JSONP implementation for cross-origin requests
```javascript
function createResponse(data, callback) {
  const json = JSON.stringify(data);
  const response = callback ? `${callback}(${json})` : json;
  
  return ContentService
    .createTextOutput(response)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
```

#### Performance Optimization

**Batch Processing**: Large dataset handling
```javascript
function getTransactionsBatch(batchNumber, batchSize) {
  const startRow = (batchNumber * batchSize) + 2;
  const numRows = Math.min(batchSize, getTotalRows() - startRow + 1);
  
  if (numRows <= 0) {
    return { transactions: [], hasMore: false };
  }
  
  const range = sheet.getRange(startRow, 1, numRows, getLastColumn());
  const values = range.getValues();
  
  return {
    transactions: values.map(formatTransaction),
    hasMore: startRow + numRows - 1 < getTotalRows()
  };
}
```

**Caching**: Request optimization
```javascript
function getCachedData(key, dataFunction, cacheMinutes = 5) {
  const cache = CacheService.getScriptCache();
  let cached = cache.get(key);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const data = dataFunction();
  cache.put(key, JSON.stringify(data), cacheMinutes * 60);
  return data;
}
```

#### Error Handling

**Exception Management**:
```javascript
function handleError(error, context) {
  console.error(`Error in ${context}:`, error);
  
  return createResponse({
    error: 'Internal server error',
    message: error.message,
    context: context
  });
}
```

### Deployment Requirements

1. Google Apps Script project creation
2. Backend code implementation
3. SHEET_ID and API_KEY configuration
4. Google Sheets access permissions
5. Web application deployment with public access
6. URL generation for frontend integration

### System Limitations

**Execution Constraints**:
- 6-minute maximum execution time per request
- Handled through batch processing and client-side pagination
- Daily quota limits: 6 hours execution time, 100MB runtime storage

**Performance Considerations**:
- Cold start latency for first request after inactivity
- Server-side filtering recommended for large datasets
- Client-side caching implemented for UI responsiveness

## Installation

### Prerequisites

- Node.js 18 or higher
- Google Account with Sheets and Apps Script access
- Transaction data in supported format

### Setup Process

#### 1. Frontend Installation

```bash
git clone https://github.com/mubaraknumann/MyFinances.git
cd MyFinances
npm install
cp .env.example .env
```

#### 2. Data Preparation

Create Google Sheet with required columns:
```
A: Transaction_ID      (Unique identifier)
B: Timestamp          (Date: YYYY-MM-DD HH:MM:SS)
C: Bank               (Bank name)
D: Recipient_Merchant (Merchant/Recipient name)
E: Amount             (Numeric amount)
F: Debit_Credit       (Either "Debit" or "Credit")
G: Transaction_Method (Payment method)
H: Category           (Optional: Transaction category)
I: Raw_Message        (Optional: Original bank message)
```

Sample data format:
```
Transaction_ID | Timestamp           | Bank      | Recipient_Merchant | Amount | Debit_Credit | Transaction_Method | Category
TXN001        | 2024-01-15 14:30:00 | HDFC Bank | Amazon            | 2500   | Debit        | UPI               | Shopping
TXN002        | 2024-01-15 09:15:00 | HDFC Bank | Salary Credit     | 75000  | Credit       | NEFT              | Income
```

#### 3. Backend Configuration

1. Create Google Apps Script project at script.google.com
2. Replace default code with `updated-backend-script.gs` content
3. Configure constants:
   ```javascript
   const SHEET_ID = 'your-google-sheet-id';
   const API_KEY = 'your-secure-api-key';
   ```
4. Deploy as web application with public access
5. Copy deployment URL

#### 4. Frontend Configuration

Update `.env` file:
```env
VITE_API_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

Start development server:
```bash
npm run dev
```

#### 5. Authentication Setup

1. Access application at http://localhost:3000
2. Enter Google Apps Script URL
3. Provide API key
4. Verify connection

## Configuration

### Transaction Filtering

Modify filtering logic in `src/utils/transactionFilters.js`:

```javascript
// Time window for transfer detection
const timeWindowMs = 10 * 60 * 1000; // 10 minutes

// Bank configuration for internal transfer detection
const userBanks = [
  'axis bank', 'hdfc bank', 'hsbc', 'icici bank', 'idfc first bank'
];

// Transfer pattern recognition
const transferPatterns = [
  'credit card payment', 'cc payment', 'auto transfer'
];
```

### Category Management

Default categories defined in `src/utils/categoryManager.js`:

```javascript
const DEFAULT_CATEGORIES = [
  'Food & Dining', 'Shopping', 'Entertainment', 'Transport',
  'Bills & Utilities', 'Healthcare', 'Travel', 'Education',
  'Investment', 'Other'
];
```

## Development

### Project Structure
```
MyFinances/
├── src/
│   ├── components/          # UI components
│   │   ├── AuthGate.jsx    # Authentication handler
│   │   ├── Layout.jsx      # Application layout
│   │   ├── TransactionTags.jsx # Tag management
│   │   ├── TransactionCalendar.jsx # Calendar interface
│   │   └── CategoryModal.jsx # Category editor
│   ├── pages/              # Route components
│   │   ├── Dashboard.jsx   # Financial dashboard
│   │   ├── Calendar.jsx    # Transaction calendar
│   │   └── Reports.jsx     # Reporting interface
│   ├── services/           # External integrations
│   │   └── api.js         # Google Apps Script client
│   ├── utils/             # Utility functions
│   │   ├── transactionFilters.js # Transaction processing
│   │   ├── transactionTags.js    # Categorization logic
│   │   └── categoryManager.js    # Category management
│   └── styles/            # CSS files
├── updated-backend-script.gs # Google Apps Script backend
└── package.json          # Dependencies and scripts
```

### Available Commands

```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Code linting
```

### Adding Features

#### New Categories
1. Update `DEFAULT_CATEGORIES` in `categoryManager.js`
2. Categories sync automatically across devices

#### New Chart Types
1. Install Chart.js plugins: `npm install chartjs-plugin-name`
2. Register plugin in component imports
3. Implement chart component
4. Configure data processing

#### Custom Filters
1. Add filter UI in Reports.jsx
2. Update state management
3. Modify backend query logic
4. Update URL parameters for persistence

## Troubleshooting

### Common Issues

**Authentication Errors**
```
Error: Invalid API key
Solution: 
- Verify API key matches Google Apps Script configuration
- Confirm API URL is correct
- Ensure Google Apps Script is deployed as web app
```

**CORS Issues**
```
Error: Access blocked by CORS policy
Solution:
- Application uses JSONP to bypass CORS
- Verify Google Apps Script returns JSONP response
- Check callback parameter handling
```

**Data Loading Problems**
```
Error: No transactions found
Solution:
- Verify Google Sheet column headers match required format
- Confirm Sheet ID in Google Apps Script
- Check data format consistency
- Test Google Apps Script URL directly
```

**Performance Issues**
```
Issue: Slow loading with large datasets
Solution:
- Enable transaction batching (default: 1000 per batch)
- Implement server-side filtering
- Use date range filters
- Consider data archiving for historical transactions
```

### Debug Configuration

Enable detailed logging:

```javascript
// In src/services/api.js
const DEBUG_MODE = true;

// In Google Apps Script
function debug(message) {
  console.log(`[DEBUG] ${new Date().toISOString()}: ${message}`);
}
```

### Browser Support

**Desktop Browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Mobile Browsers:**
- iOS Safari 14+
- Android Chrome 90+

## Deployment

### Frontend Deployment

#### Vercel
```bash
npm i -g vercel
vercel
# Configure VITE_API_URL in dashboard
```

#### Netlify
```bash
npm i -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

#### GitHub Pages
```bash
npm install --save-dev gh-pages
# Add "deploy": "npm run build && gh-pages -d dist" to package.json
npm run deploy
```

### Backend Optimization

#### Performance Tuning
```javascript
// Caching implementation
const cache = CacheService.getScriptCache();

// Batch operations
const batchSize = 100;

// Parallel processing
const parallelPromises = chunks.map(chunk => processChunk(chunk));
```

#### Rate Limiting
```javascript
const RATE_LIMIT = 100; // requests per minute
const rateLimitCache = CacheService.getScriptCache();
```

## Usage

### Basic Workflow

1. Import transaction data to Google Sheets
2. Configure and deploy Google Apps Script backend
3. Start frontend application
4. Authenticate with API credentials
5. Review dashboard analytics
6. Categorize transactions using calendar view
7. Generate reports with filtering options

### Data Management

#### Transaction Import
- Export CSV/Excel from banking applications
- Map columns to required format
- Import using Google Sheets interface
- Validate data consistency

#### Category Assignment
- Use calendar view for individual transaction categorization
- Apply bulk category updates in reports view
- Create custom categories as needed
- Categories sync automatically across devices

## Contributing

### Development Setup
```bash
git clone https://github.com/YOUR_USERNAME/MyFinances.git
cd MyFinances
git checkout -b feature/feature-name
# Make changes
git commit -m "Description of changes"
git push origin feature/feature-name
# Create pull request
```

### Guidelines

1. Follow existing code patterns and conventions
2. Test changes thoroughly across different browsers
3. Update documentation for new features
4. Do not commit sensitive information
5. Consider performance impact of changes

### Issue Reporting

Use GitHub Issues with the following information:
- Clear description of the problem
- Steps to reproduce the issue
- Expected vs actual behavior
- Environment details (OS, browser, version)
- Screenshots if applicable

## License

MIT License - see LICENSE file for details.

## Dependencies

- **Chart.js**: Data visualization library
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **date-fns**: Date manipulation utilities
- **Heroicons**: SVG icon library
- **Google Apps Script**: Serverless backend platform

## Support

- GitHub Issues for bug reports and feature requests
- Documentation in README and code comments
- Community contributions and discussions