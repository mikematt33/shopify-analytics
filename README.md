# Shopify Order Analytics System 

A React web application for analyzing Shopify order data with user authentication, CSV processing, and profit calculations.

## Features

- 🔐 **User Authentication**: Simple localStorage-based user system
- 📊 **CSV Processing**: Upload and parse Shopify order export files
- 📈 **Analytics Dashboard**: View order counts, product performance, and summaries
- 💰 **Profit Calculator**: Set product costs and calculate profits automatically
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🚀 **GitHub Pages Ready**: Automated deployment via GitHub Actions

## Getting Started

### Development

1. Clone this repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Open http://localhost:5173

### Deployment

The app is configured to deploy automatically to GitHub Pages when you push to the main branch.

## How to Use

1. **Register/Login**:
   - **Demo Account Available**: Email: `demo@demo.com`, Password: `demo123`
   - Or create your own account (data stored locally in browser)
2. **Export from Shopify**: Export your orders as a CSV file from your Shopify admin
3. **Upload CSV**: Drag and drop or click to upload your CSV file
4. **View Analytics**: Explore the different tabs:
   - **Overview**: Summary statistics
   - **Products**: Product performance breakdown
   - **Profit Calculator**: Set costs and calculate profits
   - **Orders**: View individual orders

## Important Features

- **No Database Required**: All data is stored locally in your browser (localStorage)
- **Cross-Device**: Each device/browser maintains its own data (not synced between devices)
- **Duplicate Handling**: Automatically detects and skips duplicate entries when processing CSV files
- **Mobile Responsive**: Optimized for both desktop and mobile viewing

## Expected CSV Format

The application expects Shopify order export CSV files with columns such as:

- `Name` or `Order` - Order identifier
- `Lineitem name` or `Product Title` - Product name
- `Lineitem variant` or `Variant` - Product variant
- `Lineitem quantity` or `Quantity` - Quantity ordered
- `Lineitem price` or `Price` - Item price
- `Total` or `Subtotal` - Order total
- `Created at` or `Date` - Order date

## Data Storage

- User accounts are stored in browser localStorage
- CSV data is processed and stored locally
- Product cost settings are persisted between sessions
- **Security**: CSV files are automatically ignored by git (`.gitignore`) to protect sensitive order data

## Technology Stack

- React 19 with Vite
- Papa Parse for CSV processing
- React Router for navigation
- CSS for styling
- GitHub Actions for deployment

## License

This project is for personal/educational use.
