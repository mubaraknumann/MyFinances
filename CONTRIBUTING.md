# Contributing to MyFinances

Thank you for your interest in contributing to MyFinances! This document provides guidelines and instructions for contributing to this personal finance tracking system.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- Google Account for testing Google Apps Script integration
- Basic knowledge of React, JavaScript, and Google Apps Script
- Familiarity with financial data concepts

### Development Setup

1. **Fork and Clone**
   ```bash
   # Fork the repository on GitHub
   git clone https://github.com/YOUR_USERNAME/MyFinances.git
   cd MyFinances
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Add your test Google Apps Script URL
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## 📝 Development Guidelines

### Code Style

- **JavaScript**: Follow ES6+ standards
- **React**: Use functional components with hooks
- **CSS**: Tailwind CSS utility classes
- **Naming**: camelCase for variables, PascalCase for components
- **Comments**: JSDoc for functions, inline for complex logic

### Component Structure

```javascript
// Component imports
import React, { useState, useEffect } from 'react';

// Utility imports
import { utilityFunction } from '../utils/helpers';

// Component definition
const ComponentName = ({ prop1, prop2 }) => {
  // State and hooks
  const [state, setState] = useState(initialValue);
  
  // Event handlers
  const handleEvent = () => {
    // Implementation
  };
  
  // Render
  return (
    <div className="tailwind-classes">
      {/* Component content */}
    </div>
  );
};

export default ComponentName;
```

### File Organization

- **Components**: `/src/components/` - Reusable UI components
- **Pages**: `/src/pages/` - Route-level components
- **Utils**: `/src/utils/` - Pure utility functions
- **Services**: `/src/services/` - External API integrations
- **Styles**: Inline with Tailwind classes

## 🐛 Bug Reports

### Before Submitting

1. **Check existing issues** to avoid duplicates
2. **Test with latest version** to ensure bug still exists
3. **Reproduce consistently** with clear steps
4. **Gather information** about your environment

### Bug Report Template

```markdown
## Bug Description
A clear and concise description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
A clear description of what you expected to happen.

## Actual Behavior
What actually happened instead.

## Screenshots
If applicable, add screenshots to help explain the problem.

## Environment
- OS: [e.g. macOS 12.0]
- Browser: [e.g. Chrome 96.0]
- Node.js Version: [e.g. 18.12.0]
- MyFinances Version: [e.g. 1.0.0]

## Additional Context
Any other context about the problem.

## Possible Solution
If you have ideas on how to fix this, please share.
```

## 💡 Feature Requests

### Before Submitting

1. **Check existing issues** for similar requests
2. **Consider the scope** - does it fit the project goals?
3. **Think about implementation** - is it technically feasible?
4. **Provide use cases** - who would benefit from this?

### Feature Request Template

```markdown
## Feature Description
A clear and concise description of the feature.

## Problem/Need
Explain the problem this feature would solve.

## Proposed Solution
Describe how you'd like the feature to work.

## Use Cases
- As a user, I want to... so that...
- When I'm doing..., I need to...

## Alternatives Considered
Other approaches you've thought about.

## Technical Considerations
Any technical aspects to consider.

## Additional Context
Screenshots, mockups, or examples.
```

## 🔧 Pull Request Process

### Before Starting

1. **Discuss major changes** in an issue first
2. **Check for existing work** to avoid duplication
3. **Fork the repository** and create a feature branch
4. **Follow naming conventions** for branches

### Branch Naming

- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `hotfix/description` - Critical fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

### Development Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/awesome-feature
   ```

2. **Make Changes**
   - Write clean, well-documented code
   - Follow existing patterns and conventions
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Thoroughly**
   ```bash
   # Run development server
   npm run dev
   
   # Test with your own Google Sheets data
   # Test edge cases and error scenarios
   # Test on different browsers/devices
   ```

4. **Commit Changes**
   ```bash
   # Use clear, descriptive commit messages
   git commit -m "Add awesome feature that does X"
   
   # For multiple related changes
   git commit -m "Add awesome feature
   
   - Implement core functionality
   - Add error handling
   - Update documentation"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/awesome-feature
   # Create pull request on GitHub
   ```

### Pull Request Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that causes existing functionality to not work as expected)
- [ ] Documentation update

## Related Issue
Fixes #(issue_number)

## Changes Made
- [ ] Change 1
- [ ] Change 2
- [ ] Change 3

## Testing
- [ ] Tested locally with development server
- [ ] Tested with real Google Sheets data
- [ ] Tested edge cases and error scenarios
- [ ] Works on mobile devices
- [ ] Works on different browsers

## Screenshots
If applicable, add screenshots of the changes.

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] New and existing unit tests pass locally with my changes
```

## 🧪 Testing Guidelines

### Manual Testing

1. **Core Functionality**
   - Authentication with valid/invalid credentials
   - Data loading and display
   - Filtering and sorting
   - Category management
   - Transaction tagging

2. **Edge Cases**
   - Empty data sets
   - Large data sets (1000+ transactions)
   - Network errors
   - Invalid data formats
   - Browser refresh/navigation

3. **Cross-Browser Testing**
   - Chrome (latest)
   - Firefox (latest)
   - Safari (latest)
   - Edge (latest)

4. **Mobile Testing**
   - iOS Safari
   - Android Chrome
   - Responsive design
   - Touch interactions

### Test Data Setup

Create test Google Sheets with:
- Various transaction types
- Different date ranges
- Multiple banks and payment methods
- Edge cases (very large amounts, special characters)

## 🔒 Security Guidelines

### Sensitive Data

- **Never commit** API keys, tokens, or credentials
- **Use environment variables** for configuration
- **Sanitize user input** to prevent XSS
- **Validate data** from external sources

### Code Security

```javascript
// ❌ Don't do this
const apiKey = 'hardcoded-api-key';

// ✅ Do this
const apiKey = import.meta.env.VITE_API_KEY;
```

### Data Privacy

- Only access necessary Google Sheets data
- Don't log sensitive transaction information
- Respect user privacy in error reporting
- Use secure communication (HTTPS only)

## 📚 Documentation Standards

### Code Comments

```javascript
/**
 * Calculates the total spending for a given period
 * @param {Array} transactions - Array of transaction objects
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {number} Total spending amount
 */
const calculateSpending = (transactions, startDate, endDate) => {
  // Implementation with inline comments for complex logic
};
```

### README Updates

- Update feature lists for new functionality
- Add setup instructions for new dependencies
- Include troubleshooting for new edge cases
- Update screenshots if UI changes significantly

## 🚀 Release Process

### Version Numbers

Follow Semantic Versioning (SemVer):
- `MAJOR.MINOR.PATCH` (e.g., 1.2.3)
- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes (backward compatible)

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] Version number updated
- [ ] Changelog updated
- [ ] Security review completed
- [ ] Performance testing done

## 💬 Community Guidelines

### Communication

- **Be respectful** and inclusive
- **Stay on topic** in discussions
- **Provide context** when asking for help
- **Share knowledge** and help others

### Code Reviews

- **Be constructive** in feedback
- **Explain reasoning** behind suggestions
- **Appreciate contributions** from others
- **Learn from discussions**

## 🆘 Getting Help

### Resources

- **Documentation**: Read the main README thoroughly
- **Issues**: Search existing issues for answers
- **Code Examples**: Look at existing components for patterns
- **Google Apps Script**: Check official documentation

### Contact

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For general questions and ideas
- **Code Review**: In pull request comments

---

## Thank You! 🙏

Your contributions help make MyFinances better for everyone. Whether it's a bug fix, new feature, documentation improvement, or just sharing feedback, every contribution is valued.

**Happy coding!** 🎉