# MyFinances - Personal Finance Tracker

A modern React-based personal finance tracker with Google Apps Script backend for secure transaction management and analysis.

## Features

- 📊 **Dashboard**: Real-time financial KPIs and interactive charts
- 📅 **Calendar View**: Browse transactions by date with editable categories  
- 📈 **Reports**: Advanced filtering and payment method analysis
- 🏷️ **Smart Tagging**: Automated transaction categorization with manual overrides
- 🔄 **Internal Transfer Detection**: Intelligent filtering of duplicate transactions
- 🔐 **Secure Configuration**: No hardcoded credentials or URLs

## Security & Configuration

### Environment Setup

For security, this application does **not** include hardcoded API credentials or URLs. You need to configure:

1. **Google Apps Script URL**: Your deployed Google Apps Script web app URL
2. **API Key**: A secure key for authentication with your backend

### Configuration Options

#### Option 1: Environment Variables (Recommended for development)
```bash
# Create .env file in project root
VITE_API_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

#### Option 2: Runtime Configuration (Default)
The application will prompt you to enter:
- Google Apps Script URL
- API Key

These are stored securely in localStorage and can be updated anytime.

## Getting Started

### Prerequisites
- Node.js 18+
- Google Apps Script deployment
- Your transaction data in Google Sheets

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mubaraknumann/MyFinances.git
   cd MyFinances
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Configure your backend**
   - Deploy the included Google Apps Script (`updated-backend-script.gs`)
   - Note down your script's web app URL
   - Set up your API key in the script

5. **Launch the application**
   - Open http://localhost:5173
   - Enter your Google Apps Script URL and API Key
   - Start managing your finances!

## Google Apps Script Setup

1. **Create a new Google Apps Script project**
2. **Copy the code from `updated-backend-script.gs`**
3. **Connect to your Google Sheets with transaction data**
4. **Deploy as web app with appropriate permissions**
5. **Configure API key authentication**

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── AuthGate.jsx    # Authentication handler
│   ├── Layout.jsx      # App layout and navigation
│   └── TransactionTags.jsx # Transaction categorization
├── pages/              # Main application pages
│   ├── Dashboard.jsx   # Financial overview and KPIs
│   ├── Calendar.jsx    # Transaction calendar view
│   └── Reports.jsx     # Advanced reporting and filtering
├── services/           # External service integrations
│   └── api.js         # Google Apps Script API client
└── utils/             # Utility functions
    ├── transactionFilters.js # Transaction processing logic
    └── transactionTags.js    # Automated categorization
```

## Key Features

### Smart Transaction Filtering
- **Internal Transfer Detection**: Automatically identifies and excludes duplicate transfers between your accounts
- **Paired Transaction Logic**: Matches debit/credit pairs within time windows
- **Manual Override**: Tag transactions manually when automatic detection needs correction

### Financial Analytics
- **Real-time KPIs**: Total spending, income, net flow, transaction counts
- **Interactive Charts**: Spending trends, category breakdowns, payment method analysis
- **Advanced Filtering**: Filter by date, bank, payment method, amount ranges

### Security Features
- **No Hardcoded Secrets**: All sensitive data configured at runtime
- **Secure Storage**: Credentials stored in browser localStorage
- **CORS Handling**: JSONP implementation for Google Apps Script communication

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

---

Built with ❤️ using React, Tailwind CSS, and Google Apps Script