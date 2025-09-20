import { useState, useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { useAuth } from "./hooks/useAuth";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import CsvUpload from "./components/CsvUpload";
import Modal from "./components/Modal";
import "./App.css";

const AppContent = () => {
  const { user, logout, loading } = useAuth();
  const [orderData, setOrderData] = useState(() => {
    const saved = localStorage.getItem("shopifyOrderData");
    return saved ? JSON.parse(saved) : null;
  });
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : true; // Default to dark mode
  });

  const [showClearModal, setShowClearModal] = useState(false);
  const [clearModalStep, setClearModalStep] = useState(1); // 1: first confirmation, 2: final confirmation
  const [lastUploadStats, setLastUploadStats] = useState(null); // Track last upload statistics

  // Auto-hide upload stats after 25 seconds
  useEffect(() => {
    if (lastUploadStats) {
      const timer = setTimeout(() => {
        setLastUploadStats(null);
      }, 25000); // 25 seconds

      return () => clearTimeout(timer);
    }
  }, [lastUploadStats]);

  // Apply dark mode to document
  useEffect(() => {
    const theme = darkMode ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleDataLoaded = (newData, shouldMerge = false) => {
    // Capture upload statistics before processing
    if (newData.summary) {
      setLastUploadStats({
        totalProcessed: newData.orders.length,
        skippedDuplicates: newData.summary.skippedDuplicates || 0,
        totalAttempted:
          newData.orders.length + (newData.summary.skippedDuplicates || 0),
        isMerge: shouldMerge,
      });
    }

    if (shouldMerge && orderData) {
      const mergedData = mergeOrderData(orderData, newData);
      setOrderData(mergedData);
      localStorage.setItem("shopifyOrderData", JSON.stringify(mergedData));
    } else {
      setOrderData(newData);
      localStorage.setItem("shopifyOrderData", JSON.stringify(newData));
    }
  };

  const mergeOrderData = (existingData, newData) => {
    const mergedOrders = [...existingData.orders];
    const mergedProducts = [...existingData.products];
    const existingOrderIds = new Set(existingData.orders.map((o) => o.id));

    newData.orders.forEach((order) => {
      if (!existingOrderIds.has(order.id)) {
        mergedOrders.push(order);
      }
    });

    newData.products.forEach((newProduct) => {
      const productKey = `${newProduct.name} - ${newProduct.variant}`;
      const existingIndex = mergedProducts.findIndex(
        (p) => `${p.name} - ${p.variant}` === productKey
      );

      if (existingIndex >= 0) {
        mergedProducts[existingIndex].totalQuantity += newProduct.totalQuantity;
        mergedProducts[existingIndex].totalRevenue += newProduct.totalRevenue;
        mergedProducts[existingIndex].orders = [
          ...new Set([
            ...mergedProducts[existingIndex].orders,
            ...newProduct.orders,
          ]),
        ];
      } else {
        mergedProducts.push(newProduct);
      }
    });

    return {
      orders: mergedOrders,
      products: mergedProducts,
      summary: {
        totalOrders: mergedOrders.length,
        totalProducts: mergedProducts.length,
        totalRevenue: mergedOrders.reduce(
          (sum, order) => sum + (order.total || 0),
          0
        ),
        totalItems: mergedProducts.reduce(
          (sum, product) => sum + (product.totalQuantity || 0),
          0
        ),
      },
    };
  };

  const handleExportData = () => {
    if (!orderData) return;

    const dataToExport = {
      exportDate: new Date().toISOString(),
      data: orderData,
      costSettings: JSON.parse(localStorage.getItem("costSettings") || "{}"),
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shopify-analytics-backup-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearData = () => {
    setOrderData(null);
    localStorage.removeItem("shopifyOrderData");
  };

  const handleRemoveAllData = () => {
    setShowClearModal(true);
    setClearModalStep(1);
  };

  const handleClearModalConfirm = () => {
    if (clearModalStep === 1) {
      // First confirmation - go to final confirmation
      setClearModalStep(2);
    } else {
      // Final confirmation - actually clear the data
      setOrderData(null);
      localStorage.removeItem("shopifyOrderData");
      localStorage.removeItem("costSettings");
      localStorage.removeItem("sizeCostingEnabled");
      localStorage.removeItem("sizeOverrides");
      setShowClearModal(false);
      setClearModalStep(1);
    }
  };

  const handleClearModalCancel = () => {
    setShowClearModal(false);
    setClearModalStep(1);
  };

  const handleImportBackup = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backupData = JSON.parse(e.target.result);

        if (
          backupData.data &&
          backupData.data.orders &&
          backupData.data.products
        ) {
          setOrderData(backupData.data);
          localStorage.setItem(
            "shopifyOrderData",
            JSON.stringify(backupData.data)
          );

          // Also restore cost settings if they exist
          if (backupData.costSettings) {
            localStorage.setItem(
              "costSettings",
              JSON.stringify(backupData.costSettings)
            );
          }

          alert(
            `Successfully imported ${backupData.data.orders.length} orders from backup!`
          );
        } else {
          alert("Invalid backup file format");
        }
      } catch (error) {
        alert("Error reading backup file: " + error.message);
      }
    };

    reader.readAsText(file);
    // Clear the input so the same file can be selected again
    event.target.value = "";
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>Shopify Order Analytics</h1>
          <div className="header-controls">
            <button
              onClick={toggleDarkMode}
              className="theme-toggle"
              title={`Switch to ${darkMode ? "light" : "dark"} mode`}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
            <div className="user-info">
              <span>Welcome, {user.name}!</span>
              <button onClick={logout} className="logout-btn">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        {!orderData ? (
          <div className="upload-section">
            <CsvUpload
              onDataLoaded={(data) => handleDataLoaded(data, false)}
              existingData={orderData}
            />

            <div className="import-section">
              <h3>Or Import from Backup</h3>
              <p>Restore previously exported data and settings</p>
              <div className="import-controls">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  style={{ display: "none" }}
                  id="backup-import"
                />
                <label htmlFor="backup-import" className="import-btn">
                  📥 Import Backup File
                </label>
              </div>
            </div>

            <div className="help-section">
              <h3>How to use:</h3>
              <ol>
                <li>Export your orders from Shopify as a CSV file</li>
                <li>Upload the CSV file using the form above</li>
                <li>Or import a previously exported backup file</li>
                <li>
                  View your order analytics and set product costs for profit
                  calculations
                </li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="dashboard-section">
            <div className="data-actions">
              <div className="data-actions-left">
                <button onClick={handleExportData} className="export-btn">
                  💾 Export Data
                </button>
                <button onClick={handleClearData} className="clear-data-btn">
                  🔄 Replace Data
                </button>
                <button
                  onClick={handleRemoveAllData}
                  className="remove-all-btn"
                >
                  🗑️ Remove All Data
                </button>
              </div>
              <div className="merge-upload">
                <CsvUpload
                  onDataLoaded={(data) => handleDataLoaded(data, true)}
                  buttonText="➕ Add More Data"
                  compact={true}
                  existingData={orderData}
                />
                {lastUploadStats && lastUploadStats.isMerge && (
                  <div className="upload-stats">
                    <div className="stats-content">
                      {lastUploadStats.skippedDuplicates > 0 ? (
                        <div className="duplicate-info">
                          <span className="stats-icon">🔄</span>
                          <span className="stats-text">
                            Processed {lastUploadStats.totalProcessed} new
                            orders, skipped {lastUploadStats.skippedDuplicates}{" "}
                            duplicates (out of {lastUploadStats.totalAttempted}{" "}
                            total)
                          </span>
                        </div>
                      ) : lastUploadStats.totalProcessed > 0 ? (
                        <div className="success-info">
                          <span className="stats-icon">✅</span>
                          <span className="stats-text">
                            Successfully added {lastUploadStats.totalProcessed}{" "}
                            new orders
                          </span>
                        </div>
                      ) : (
                        <div className="no-new-info">
                          <span className="stats-icon">ℹ️</span>
                          <span className="stats-text">
                            All {lastUploadStats.skippedDuplicates} orders
                            already exist - no duplicates added
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <Dashboard data={orderData} />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>
          &copy; 2025 Shopify Order Analytics. Built for order management and
          profit tracking.
        </p>
      </footer>

      {/* Clear Data Modal */}
      <Modal
        isOpen={showClearModal}
        onClose={handleClearModalCancel}
        onConfirm={handleClearModalConfirm}
        type={clearModalStep === 1 ? "warning" : "danger"}
        title={clearModalStep === 1 ? "Remove All Data?" : "Final Confirmation"}
        confirmText={
          clearModalStep === 1 ? "Yes, Continue" : "Yes, Delete Everything"
        }
        cancelText={clearModalStep === 1 ? "Cancel" : "No, Keep Data"}
        message={
          clearModalStep === 1
            ? "Are you sure you want to remove ALL data?\n\nThis will permanently delete:\n• All order data\n• All product information\n• All cost settings\n• All analytics data\n\nThis action cannot be undone. Consider exporting your data first."
            : "This will completely wipe all your data and settings. Are you absolutely sure?\n\nThis action is IRREVERSIBLE!"
        }
      />
    </div>
  );
};

function App() {
  return (
    <Router basename="/shopify-analytics">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
