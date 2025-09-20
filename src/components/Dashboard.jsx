import React, { useState, useRef } from "react";
import Pagination from "./Pagination";
import usePagination from "../hooks/usePagination";
import { useSettings } from "../hooks/useSettings";
import "./Dashboard.css";

// Component for handling size-specific cost overrides in unified mode
const SizeOverrideSection = ({
  productName,
  originalVariants,
  sizeOverrides,
  updateSizeOverride,
  removeSizeOverride,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const productOverrides = sizeOverrides[productName] || {};
  const hasOverrides = Object.keys(productOverrides).length > 0;

  const extractSizeFromVariant = (variantName) => {
    // Extract just the size part from variants like "T-shirt - Large" or "Large"
    const parts = variantName.split(" - ");
    return parts.length > 1 ? parts[parts.length - 1] : variantName;
  };

  return (
    <div className="size-override-section">
      <button
        className={`size-override-toggle ${
          hasOverrides ? "has-overrides" : ""
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <span className="toggle-text">
          Individual Size Pricing{" "}
          {hasOverrides &&
            `(${Object.keys(productOverrides).length} overrides)`}
        </span>
        <span className={`toggle-arrow ${isExpanded ? "expanded" : ""}`}>
          ▼
        </span>
      </button>

      {isExpanded && (
        <div className="size-overrides-list">
          <p className="size-override-help">
            Set custom costs for specific sizes. Leave blank to use the unified
            price above.
          </p>
          {originalVariants.map((variant, index) => {
            const sizeDisplay = extractSizeFromVariant(variant);
            const currentOverride = productOverrides[variant] || "";

            return (
              <div key={index} className="size-override-item">
                <label className="size-label">{sizeDisplay}:</label>
                <div className="size-input-group">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Use unified price"
                    value={currentOverride}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || value === "0") {
                        removeSizeOverride(productName, variant);
                      } else {
                        updateSizeOverride(productName, variant, value);
                      }
                    }}
                    className="size-cost-input"
                  />
                  {currentOverride && (
                    <button
                      type="button"
                      className="clear-override-btn"
                      onClick={() => removeSizeOverride(productName, variant)}
                      title="Clear override"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {hasOverrides && (
            <button
              type="button"
              className="clear-all-overrides-btn"
              onClick={() => {
                originalVariants.forEach((variant) => {
                  removeSizeOverride(productName, variant);
                });
              }}
            >
              Clear All Overrides
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const Dashboard = ({ data }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const { settings, updateSetting } = useSettings();

  // Refs for scroll targets
  const productsRef = useRef(null);
  const ordersRef = useRef(null);

  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: "",
    enabled: false,
  });

  // Use settings from the hook instead of localStorage
  const costSettings = settings.costSettings;
  const sizeCostingEnabled = settings.sizeCostingEnabled;
  const sizeOverrides = settings.sizeOverrides;

  const [orderFilters, setOrderFilters] = useState({
    searchTerm: "",
    sortBy: "date",
    sortOrder: "desc",
    minAmount: "",
    maxAmount: "",
  });
  const [productSort, setProductSort] = useState("revenue");
  const [productSortOrder, setProductSortOrder] = useState("desc");
  const [productView, setProductView] = useState("cards");
  const [productCombineMode, setProductCombineMode] = useState("none"); // 'none', 'by-size', 'by-name'

  // Pagination states - will be initialized when data is processed
  const [processedProducts, setProcessedProducts] = useState([]);
  const [processedOrders, setProcessedOrders] = useState([]);

  // Pagination hooks
  const productsPagination = usePagination(processedProducts, 25);
  const ordersPagination = usePagination(processedOrders, 25);

  // Debug logging
  console.log("Dashboard received data:", data);

  const updateProductCost = (productName, cost) => {
    const newCostSettings = {
      ...costSettings,
      [productName]: parseFloat(cost) || 0,
    };
    updateSetting("costSettings", newCostSettings);
  };

  const updateSizeOverride = (productName, sizeName, cost) => {
    const newSizeOverrides = {
      ...sizeOverrides,
      [productName]: {
        ...sizeOverrides[productName],
        [sizeName]: parseFloat(cost) || 0,
      },
    };
    updateSetting("sizeOverrides", newSizeOverrides);
  };

  const removeSizeOverride = (productName, sizeName) => {
    const newOverrides = { ...sizeOverrides };
    if (newOverrides[productName]) {
      delete newOverrides[productName][sizeName];
      // Remove the product entry if no overrides left
      if (Object.keys(newOverrides[productName]).length === 0) {
        delete newOverrides[productName];
      }
    }
    updateSetting("sizeOverrides", newOverrides);
  };

  const toggleSizeCostingEnabled = (enabled) => {
    updateSetting("sizeCostingEnabled", enabled);
  };

  const calculateProfits = (dataToUse = data) => {
    if (!dataToUse || !dataToUse.products)
      return { totalProfit: 0, profitByProduct: [] };

    let totalProfit = 0;
    const profitByProduct = dataToUse.products.map((product) => {
      let cost, totalCost;

      if (sizeCostingEnabled) {
        // Individual size pricing mode - use existing logic
        cost = costSettings[product.name] || 0;
        totalCost = cost * product.totalQuantity;
      } else {
        // Unified pricing mode - check for size overrides
        const baseProductName = product.name;
        const baseCost = costSettings[baseProductName] || 0;
        const productOverrides = sizeOverrides[baseProductName] || {};

        if (
          product.originalVariants &&
          product.originalVariants.length > 1 &&
          Object.keys(productOverrides).length > 0
        ) {
          // Calculate weighted cost based on overrides and unified pricing
          totalCost = 0;
          const avgQuantityPerVariant =
            product.totalQuantity / product.originalVariants.length;

          product.originalVariants.forEach((variant) => {
            const variantCost =
              productOverrides[variant] !== undefined
                ? productOverrides[variant]
                : baseCost;
            totalCost += variantCost * avgQuantityPerVariant;
          });

          cost = totalCost / product.totalQuantity; // Average cost per unit
        } else {
          // No overrides, use unified pricing
          cost = baseCost;
          totalCost = cost * product.totalQuantity;
        }
      }

      const profit = product.totalRevenue - totalCost;
      totalProfit += profit;

      return {
        ...product,
        cost: cost,
        totalCost: totalCost,
        profit: profit,
        profitMargin:
          product.totalRevenue > 0 ? (profit / product.totalRevenue) * 100 : 0,
      };
    });

    return { totalProfit, profitByProduct };
  };

  // Filter data based on date range
  const getFilteredData = () => {
    if (
      !data ||
      !dateFilter.enabled ||
      !dateFilter.startDate ||
      !dateFilter.endDate
    ) {
      return data;
    }

    const startDate = new Date(dateFilter.startDate);
    const endDate = new Date(dateFilter.endDate);
    endDate.setHours(23, 59, 59, 999); // Include full end date

    const filteredOrders = data.orders.filter((order) => {
      const orderDate = new Date(order.date);
      return orderDate >= startDate && orderDate <= endDate;
    });

    // Recalculate products based on filtered orders
    const productMap = {};
    filteredOrders.forEach((order) => {
      order.items.forEach((item) => {
        const key = `${item.product} - ${item.variant}`;
        if (!productMap[key]) {
          productMap[key] = {
            name: item.product,
            variant: item.variant,
            totalQuantity: 0,
            totalRevenue: 0,
            orders: [],
          };
        }
        productMap[key].totalQuantity += item.quantity;
        productMap[key].totalRevenue += item.price * item.quantity;
        if (!productMap[key].orders.includes(order.id)) {
          productMap[key].orders.push(order.id);
        }
      });
    });

    const filteredProducts = Object.values(productMap);

    return {
      orders: filteredOrders,
      products: filteredProducts,
      summary: {
        totalOrders: filteredOrders.length,
        totalProducts: filteredProducts.length,
        totalRevenue: filteredOrders.reduce(
          (sum, order) => sum + (order.total || 0),
          0
        ),
        totalItems: filteredProducts.reduce(
          (sum, product) => sum + (product.totalQuantity || 0),
          0
        ),
      },
    };
  };

  const filteredData = getFilteredData();
  const { totalProfit, profitByProduct } = calculateProfits(filteredData);

  // Calculate trends and insights
  const getAdvancedAnalytics = () => {
    if (!filteredData || !filteredData.orders) return null;

    const orders = filteredData.orders;
    const products = profitByProduct;

    // Top products by profit margin
    const topProfitMargin = [...products]
      .filter((p) => p.profit > 0)
      .sort((a, b) => b.profitMargin - a.profitMargin)
      .slice(0, 5);

    // Best selling products
    const bestSellers = [...filteredData.products]
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 5);

    // Revenue trend (if we have date range)
    const revenueTrend =
      dateFilter.enabled && orders.length > 0
        ? calculateRevenueTrend(orders)
        : null;

    return {
      topProfitMargin,
      bestSellers,
      revenueTrend,
      totalProducts: filteredData.products.length,
      totalOrders: orders.length,
    };
  };

  const calculateRevenueTrend = (orders) => {
    const dailyRevenue = {};
    orders.forEach((order) => {
      const date = new Date(order.date).toDateString();
      dailyRevenue[date] = (dailyRevenue[date] || 0) + order.total;
    });

    return Object.entries(dailyRevenue)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([date, revenue]) => ({ date, revenue }));
  };

  const analytics = getAdvancedAnalytics();

  if (!data) {
    return (
      <div className="dashboard-container">
        <div className="no-data">
          <h3>No Data Available</h3>
          <p>Upload a CSV file to view your order analytics</p>
        </div>
      </div>
    );
  }

  const renderDateFilter = () => (
    <div className="date-filter-section">
      <div className="filter-toggle">
        <label>
          <input
            type="checkbox"
            checked={dateFilter.enabled}
            onChange={(e) =>
              setDateFilter((prev) => ({ ...prev, enabled: e.target.checked }))
            }
          />
          Enable Date Filter
        </label>
      </div>
      {dateFilter.enabled && (
        <div className="date-inputs">
          <div className="date-input-group">
            <label>Start Date:</label>
            <input
              type="date"
              value={dateFilter.startDate}
              onChange={(e) =>
                setDateFilter((prev) => ({
                  ...prev,
                  startDate: e.target.value,
                }))
              }
            />
          </div>
          <div className="date-input-group">
            <label>End Date:</label>
            <input
              type="date"
              value={dateFilter.endDate}
              onChange={(e) =>
                setDateFilter((prev) => ({ ...prev, endDate: e.target.value }))
              }
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderOverview = () => (
    <div>
      {renderDateFilter()}
      <div className="overview-grid">
        <div className="stat-card">
          <div className="stat-number">{filteredData.summary.totalOrders}</div>
          <div className="stat-label">Total Orders</div>
        </div>

        <div className="stat-card">
          <div className="stat-number">
            {filteredData.summary.totalProducts}
          </div>
          <div className="stat-label">Unique Products</div>
        </div>

        <div className="stat-card">
          <div className="stat-number">
            ${filteredData.summary.totalRevenue.toFixed(2)}
          </div>
          <div className="stat-label">Total Revenue</div>
        </div>

        <div className="stat-card">
          <div
            className={`stat-number ${
              totalProfit >= 0 ? "positive" : "negative"
            }`}
          >
            ${totalProfit.toFixed(2)}
          </div>
          <div className="stat-label">Total Profit</div>
        </div>
      </div>

      {dateFilter.enabled && analytics.revenueTrend && (
        <div className="trend-section">
          <h3>Revenue Trend</h3>
          <div className="trend-chart">
            {analytics.revenueTrend.map((point, index) => (
              <div key={index} className="trend-point">
                <span className="trend-date">
                  {new Date(point.date).toLocaleDateString()}
                </span>
                <span className="trend-value">${point.revenue.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderProducts = () => {
    // First apply combining logic
    let productsToDisplay = [...data.products];

    if (productCombineMode === "none") {
      // Show individual variants - expand originalVariants back to individual items
      const expandedProducts = [];
      data.products.forEach((product) => {
        if (product.originalVariants && product.originalVariants.length > 1) {
          // Split this combined product back into individual variants
          const avgQuantityPerVariant = Math.floor(
            product.totalQuantity / product.originalVariants.length
          );
          const avgRevenuePerVariant =
            product.totalRevenue / product.originalVariants.length;
          const avgOrdersPerVariant = Math.floor(
            product.orders.length / product.originalVariants.length
          );

          product.originalVariants.forEach((variantName, index) => {
            // Extract product name and variant from the combined string
            const parts = variantName.split(" - ");
            const productName = parts[0] || product.name;
            const variant = parts[1] || `Variant ${index + 1}`;

            expandedProducts.push({
              name: productName,
              variant: variant,
              totalQuantity:
                avgQuantityPerVariant +
                (index === 0
                  ? product.totalQuantity % product.originalVariants.length
                  : 0),
              totalRevenue: avgRevenuePerVariant,
              orders: product.orders.slice(0, avgOrdersPerVariant),
              originalVariants: [variantName], // Single variant
            });
          });
        } else {
          // Single variant product, keep as is
          expandedProducts.push(product);
        }
      });
      productsToDisplay = expandedProducts;
    } else if (productCombineMode === "by-name") {
      // Group all variants by product name
      const grouped = {};
      data.products.forEach((product) => {
        const key = product.name;
        if (!grouped[key]) {
          grouped[key] = {
            name: product.name,
            variant: "All Variants",
            totalQuantity: 0,
            totalRevenue: 0,
            orders: [],
            originalVariants: [],
          };
        }
        grouped[key].totalQuantity += product.totalQuantity;
        grouped[key].totalRevenue += product.totalRevenue;
        grouped[key].orders = [
          ...new Set([...grouped[key].orders, ...product.orders]),
        ];
        if (product.originalVariants) {
          grouped[key].originalVariants = [
            ...new Set([
              ...grouped[key].originalVariants,
              ...product.originalVariants,
            ]),
          ];
        } else {
          // If no originalVariants, use the variant itself
          grouped[key].originalVariants.push(product.variant);
        }
      });
      productsToDisplay = Object.values(grouped);
    } else if (productCombineMode === "by-size") {
      // This maintains the existing size-based grouping logic (already applied in CsvUpload)
      productsToDisplay = data.products;
    }
    // productCombineMode === "none" shows individual variants

    // Sort products
    const sortedProducts = productsToDisplay.sort((a, b) => {
      let aValue, bValue;
      switch (productSort) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "quantity":
          aValue = a.totalQuantity;
          bValue = b.totalQuantity;
          break;
        case "orders":
          aValue = a.orders.length;
          bValue = b.orders.length;
          break;
        case "revenue":
        default:
          aValue = a.totalRevenue;
          bValue = b.totalRevenue;
          break;
      }

      if (productSortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Update processed products for pagination
    if (JSON.stringify(processedProducts) !== JSON.stringify(sortedProducts)) {
      setProcessedProducts(sortedProducts);
      productsPagination.resetPagination();
    }

    // Use paginated data for display
    const currentProducts =
      productsPagination.paginatedData.length > 0
        ? productsPagination.paginatedData
        : sortedProducts.slice(0, 25); // Fallback for initial render

    return (
      <div className="products-section" ref={productsRef}>
        {/* Pagination at top */}
        {sortedProducts.length > 0 && (
          <Pagination
            currentPage={productsPagination.currentPage}
            totalPages={productsPagination.totalPages}
            pageSize={productsPagination.pageSize}
            totalItems={sortedProducts.length}
            onPageChange={productsPagination.handlePageChange}
            onPageSizeChange={productsPagination.handlePageSizeChange}
            itemName="products"
            scrollTargetRef={productsRef}
          />
        )}

        <div className="products-header">
          <h3>Product Performance ({productsToDisplay.length} products)</h3>

          <div className="products-controls">
            <div className="combine-toggle">
              <label>Combine Products:</label>
              <select
                value={productCombineMode}
                onChange={(e) => setProductCombineMode(e.target.value)}
                className="combine-select"
              >
                <option value="none">📦 Individual Variants</option>
                <option value="by-size">📏 Grouped by Size</option>
                <option value="by-name">🔗 Grouped by Name</option>
              </select>
            </div>

            <div className="view-toggle">
              <button
                className={productView === "cards" ? "active" : ""}
                onClick={() => setProductView("cards")}
              >
                🔲 Cards
              </button>
              <button
                className={productView === "table" ? "active" : ""}
                onClick={() => setProductView("table")}
              >
                📊 Table
              </button>
            </div>

            <div className="sort-controls">
              <select
                value={productSort}
                onChange={(e) => setProductSort(e.target.value)}
                className="sort-select"
              >
                <option value="revenue">Sort by Revenue</option>
                <option value="quantity">Sort by Quantity</option>
                <option value="orders">Sort by Orders</option>
                <option value="name">Sort by Name</option>
              </select>

              <button
                onClick={() =>
                  setProductSortOrder(
                    productSortOrder === "asc" ? "desc" : "asc"
                  )
                }
                className="sort-toggle"
              >
                {productSortOrder === "asc" ? "⬆️" : "⬇️"}
              </button>
            </div>
          </div>
        </div>

        {productView === "cards" ? (
          <div className="products-grid">
            {currentProducts.map((product, index) => {
              const globalIndex =
                (productsPagination.currentPage - 1) *
                  productsPagination.pageSize +
                index;
              return (
                <div key={index} className="product-card enhanced">
                  <div className="product-card-header">
                    <h4>{product.name}</h4>
                    <span className="rank">#{globalIndex + 1}</span>
                  </div>

                  <p className="variant">{product.variant}</p>

                  {product.originalVariants &&
                    product.originalVariants.length > 1 && (
                      <div className="variant-info">
                        <span className="variant-count">
                          {product.originalVariants.length} size variants
                          combined
                        </span>
                      </div>
                    )}

                  <div className="product-stats">
                    <div className="stat primary">
                      <span className="label">Revenue</span>
                      <span className="value revenue">
                        ${product.totalRevenue.toFixed(2)}
                      </span>
                    </div>

                    <div className="stats-row">
                      <div className="stat">
                        <span className="label">Sold</span>
                        <span className="value">{product.totalQuantity}</span>
                      </div>
                      <div className="stat">
                        <span className="label">Orders</span>
                        <span className="value">{product.orders.length}</span>
                      </div>
                      <div className="stat">
                        <span className="label">Avg/Order</span>
                        <span className="value">
                          {(
                            product.totalQuantity / product.orders.length
                          ).toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <div className="stat">
                      <span className="label">Avg Price</span>
                      <span className="value">
                        $
                        {(product.totalRevenue / product.totalQuantity).toFixed(
                          2
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="products-table-container">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Product</th>
                  <th>Revenue</th>
                  <th>Quantity</th>
                  <th>Orders</th>
                  <th>Avg Price</th>
                  <th>Avg/Order</th>
                </tr>
              </thead>
              <tbody>
                {currentProducts.map((product, index) => {
                  const globalIndex =
                    (productsPagination.currentPage - 1) *
                      productsPagination.pageSize +
                    index;
                  return (
                    <tr key={index}>
                      <td className="rank-cell">#{globalIndex + 1}</td>
                      <td className="product-cell">
                        <div>
                          <strong>{product.name}</strong>
                          <div className="variant-small">{product.variant}</div>
                          {product.originalVariants &&
                            product.originalVariants.length > 1 && (
                              <div className="variant-count-small">
                                {product.originalVariants.length} variants
                              </div>
                            )}
                        </div>
                      </td>
                      <td className="revenue-cell">
                        ${product.totalRevenue.toFixed(2)}
                      </td>
                      <td>{product.totalQuantity}</td>
                      <td>{product.orders.length}</td>
                      <td>
                        $
                        {(product.totalRevenue / product.totalQuantity).toFixed(
                          2
                        )}
                      </td>
                      <td>
                        {(
                          product.totalQuantity / product.orders.length
                        ).toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={productsPagination.currentPage}
          totalPages={productsPagination.totalPages}
          pageSize={productsPagination.pageSize}
          totalItems={productsPagination.totalItems}
          onPageChange={productsPagination.handlePageChange}
          onPageSizeChange={productsPagination.handlePageSizeChange}
          itemName="products"
          scrollTargetRef={productsRef}
        />
      </div>
    );
  };

  const renderProfitCalculator = () => {
    // Group products by name if size costing is disabled
    const getProductsForCosting = () => {
      if (sizeCostingEnabled) {
        // Show individual variants - expand originalVariants back to individual items
        const expandedProducts = [];
        data.products.forEach((product) => {
          if (product.originalVariants && product.originalVariants.length > 1) {
            // Split this combined product back into individual variants for costing
            const avgQuantityPerVariant = Math.floor(
              product.totalQuantity / product.originalVariants.length
            );
            const avgRevenuePerVariant =
              product.totalRevenue / product.originalVariants.length;

            product.originalVariants.forEach((variantName, index) => {
              // Extract product name and variant from the combined string
              const parts = variantName.split(" - ");
              const productName = parts[0] || product.name;
              const variant = parts[1] || `Variant ${index + 1}`;

              expandedProducts.push({
                name: productName,
                variant: variant,
                totalQuantity:
                  avgQuantityPerVariant +
                  (index === 0
                    ? product.totalQuantity % product.originalVariants.length
                    : 0),
                totalRevenue: avgRevenuePerVariant,
                orders: product.orders,
                originalVariants: [variantName], // Single variant
                displayName: variantName, // For cost key
              });
            });
          } else {
            // Single variant product, keep as is
            expandedProducts.push({
              ...product,
              displayName: `${product.name} - ${product.variant}`,
            });
          }
        });
        return expandedProducts;
      } else {
        // For unified pricing, group ALL variants under the same product name
        // This ensures truly unique products regardless of how they were initially processed
        const grouped = {};
        data.products.forEach((product) => {
          // Use base product name (remove size indicators for cleaner grouping)
          const baseName =
            product.name
              .replace(/\b(XS|S|M|L|XL|XXL|XXXL|2XL|3XL|\d+XL)\b/gi, "")
              .trim()
              .replace(/\s+/g, " ") || product.name;

          if (!grouped[baseName]) {
            grouped[baseName] = {
              name: baseName,
              variant: "All Sizes",
              totalQuantity: 0,
              totalRevenue: 0,
              orders: [],
              originalVariants: [],
              baseProductName: product.name, // Keep original for reference
            };
          }

          // Aggregate data
          grouped[baseName].totalQuantity += product.totalQuantity;
          grouped[baseName].totalRevenue += product.totalRevenue;

          // Merge orders (remove duplicates)
          product.orders.forEach((orderId) => {
            if (!grouped[baseName].orders.includes(orderId)) {
              grouped[baseName].orders.push(orderId);
            }
          });

          // Track original variants for display
          if (product.originalVariants && product.originalVariants.length > 0) {
            product.originalVariants.forEach((variant) => {
              if (!grouped[baseName].originalVariants.includes(variant)) {
                grouped[baseName].originalVariants.push(variant);
              }
            });
          } else {
            // If no originalVariants, use the product itself
            const variantName = `${product.name} - ${product.variant}`;
            if (!grouped[baseName].originalVariants.includes(variantName)) {
              grouped[baseName].originalVariants.push(variantName);
            }
          }
        });

        return Object.values(grouped);
      }
    };

    const productsForCosting = getProductsForCosting();

    return (
      <div className="profit-section">
        <div className="profit-header">
          <h3>Profit Calculator</h3>

          <div className="costing-mode-toggle">
            <div className="toggle-header">
              <h4>📏 Size Pricing Mode</h4>
              <p className="toggle-info">
                Choose how to handle different product sizes
              </p>
            </div>

            <label className="toggle-label">
              <input
                type="checkbox"
                checked={sizeCostingEnabled}
                onChange={(e) => toggleSizeCostingEnabled(e.target.checked)}
                className="toggle-checkbox"
              />
              <span className="toggle-slider"></span>
              <div className="toggle-content">
                <span className="toggle-text">
                  {sizeCostingEnabled
                    ? "Individual Size Pricing"
                    : "Unified Size Pricing"}
                </span>
                <p className="toggle-description">
                  {sizeCostingEnabled
                    ? "Set different costs for each size variant (e.g., Small $5, Large $8). Perfect when your costs vary by size."
                    : "Use the same cost for all sizes of each product (recommended). Simpler and works for most scenarios."}
                </p>
              </div>
            </label>
          </div>
        </div>

        <p className="section-description">
          Set the cost per unit for each product to calculate profits
          automatically.
          {!sizeCostingEnabled &&
            " Costs will apply to all sizes of each product."}
        </p>

        <div className="profit-grid">
          {productsForCosting.map((product, index) => {
            const costKey = sizeCostingEnabled
              ? product.displayName || `${product.name} - ${product.variant}`
              : product.name;
            const profitData = profitByProduct.find(
              (p) =>
                p.name === product.name &&
                (sizeCostingEnabled ? p.variant === product.variant : true)
            );

            return (
              <div key={index} className="profit-card">
                <h4>{product.name}</h4>
                <p className="variant">{product.variant}</p>

                {!sizeCostingEnabled &&
                  product.originalVariants &&
                  product.originalVariants.length > 1 && (
                    <div className="unified-pricing-info">
                      <span className="info-badge">
                        Unified pricing for {product.originalVariants.length}{" "}
                        variants
                      </span>
                    </div>
                  )}

                <div className="cost-input-section">
                  <label>Cost per unit ($):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={costSettings[costKey] || ""}
                    onChange={(e) => updateProductCost(costKey, e.target.value)}
                  />
                </div>

                {/* Size Override Section - Only show in unified mode when there are multiple variants */}
                {!sizeCostingEnabled &&
                  product.originalVariants &&
                  product.originalVariants.length > 1 && (
                    <SizeOverrideSection
                      productName={product.name}
                      originalVariants={product.originalVariants}
                      sizeOverrides={sizeOverrides}
                      updateSizeOverride={updateSizeOverride}
                      removeSizeOverride={removeSizeOverride}
                    />
                  )}

                {profitData && (
                  <div className="profit-details">
                    <div className="profit-stat">
                      <span>Revenue:</span>
                      <span>${profitData.totalRevenue.toFixed(2)}</span>
                    </div>
                    <div className="profit-stat">
                      <span>Total Cost:</span>
                      <span>${profitData.totalCost.toFixed(2)}</span>
                    </div>
                    <div className="profit-stat profit-main">
                      <span>Profit:</span>
                      <span
                        className={
                          profitData.profit >= 0 ? "positive" : "negative"
                        }
                      >
                        ${profitData.profit.toFixed(2)}
                      </span>
                    </div>
                    <div className="profit-stat">
                      <span>Margin:</span>
                      <span
                        className={
                          profitData.profitMargin >= 0 ? "positive" : "negative"
                        }
                      >
                        {profitData.profitMargin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAnalytics = () => {
    // Enhanced analytics calculations
    const calculateAdvancedAnalytics = () => {
      if (!data.orders || !data.products) return null;

      // Monthly revenue trend
      const monthlyData = {};
      data.orders.forEach((order) => {
        const date = new Date(order.date);
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { revenue: 0, orders: 0, date: monthKey };
        }
        monthlyData[monthKey].revenue += order.total;
        monthlyData[monthKey].orders += 1;
      });

      const monthlyTrend = Object.values(monthlyData)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-6); // Last 6 months

      // Average order value
      const avgOrderValue =
        data.summary.totalRevenue / data.summary.totalOrders;

      // Product performance metrics
      const topPerformers = data.products
        .map((product) => {
          const cost = costSettings[product.name] || 0;
          const profit = product.totalRevenue - cost * product.totalQuantity;
          const profitMargin =
            product.totalRevenue > 0
              ? (profit / product.totalRevenue) * 100
              : 0;

          return {
            ...product,
            profit,
            profitMargin,
            avgPrice: product.totalRevenue / product.totalQuantity,
            avgPerOrder: product.totalQuantity / product.orders.length,
          };
        })
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      // Customer behavior insights
      const orderSizes = data.orders.map((order) =>
        order.items.reduce((sum, item) => sum + item.quantity, 0)
      );
      const avgItemsPerOrder =
        orderSizes.reduce((sum, size) => sum + size, 0) / orderSizes.length;

      // Size distribution
      const sizeDistribution = {};
      data.orders.forEach((order) => {
        order.items.forEach((item) => {
          // Check both product name and variant for size indicators
          const textToCheck = `${item.product} ${item.variant}`;

          // Comprehensive size pattern matching
          const size =
            // Standard apparel sizes
            textToCheck.match(
              /\b(XXS|XS|XS\/S|S|S\/M|M|M\/L|L|L\/XL|XL|XXL|XXXL|2XL|3XL|4XL|5XL|\d+XL)\b/i
            )?.[0] ||
            // Numeric sizes (like 2, 4, 6, etc.)
            (textToCheck.match(/\b(size\s*)?(\d{1,2})\b/i)?.[2] &&
              `Size ${textToCheck.match(/\b(size\s*)?(\d{1,2})\b/i)[2]}`) ||
            // One Size fits all
            (textToCheck.match(/\b(one\s*size|OS|OSFA|free\s*size)\b/i) &&
              "One Size") ||
            "Unknown";

          sizeDistribution[size] =
            (sizeDistribution[size] || 0) + item.quantity;
        });
      });

      const topSizes = Object.entries(sizeDistribution)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      // Revenue by day of week
      const dayOfWeekRevenue = Array(7).fill(0);
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      data.orders.forEach((order) => {
        const dayOfWeek = new Date(order.date).getDay();
        dayOfWeekRevenue[dayOfWeek] += order.total;
      });

      const bestDays = dayOfWeekRevenue
        .map((revenue, index) => ({ day: dayNames[index], revenue }))
        .sort((a, b) => b.revenue - a.revenue);

      // Profit analysis
      const profitableProducts = topPerformers.filter(
        (p) => p.profit > 0
      ).length;
      const totalProfit = topPerformers.reduce((sum, p) => sum + p.profit, 0);
      const avgProfitMargin =
        topPerformers.reduce((sum, p) => sum + p.profitMargin, 0) /
          topPerformers.length || 0;

      return {
        monthlyTrend,
        avgOrderValue,
        avgItemsPerOrder,
        topPerformers: topPerformers.slice(0, 10),
        topSizes,
        bestDays: bestDays.slice(0, 3),
        profitableProducts,
        totalProfit,
        avgProfitMargin,
        totalProducts: data.products.length,
        totalOrders: data.orders.length,
      };
    };

    const advancedAnalytics = calculateAdvancedAnalytics();

    if (!advancedAnalytics) {
      return (
        <div className="analytics-section">
          <h3>Advanced Analytics</h3>
          <p>Loading analytics data...</p>
        </div>
      );
    }

    return (
      <div className="analytics-section">
        <h3>Advanced Analytics Dashboard</h3>

        {/* Key Metrics Row */}
        <div className="metrics-overview">
          <div className="metric-card highlight">
            <div className="metric-icon">💰</div>
            <div className="metric-info">
              <span className="metric-value">
                ${advancedAnalytics.totalProfit.toFixed(2)}
              </span>
              <span className="metric-label">Total Profit</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">📊</div>
            <div className="metric-info">
              <span className="metric-value">
                {advancedAnalytics.avgProfitMargin.toFixed(1)}%
              </span>
              <span className="metric-label">Avg Profit Margin</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">🛒</div>
            <div className="metric-info">
              <span className="metric-value">
                ${advancedAnalytics.avgOrderValue.toFixed(2)}
              </span>
              <span className="metric-label">Avg Order Value</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">📦</div>
            <div className="metric-info">
              <span className="metric-value">
                {advancedAnalytics.avgItemsPerOrder.toFixed(1)}
              </span>
              <span className="metric-label">Items per Order</span>
            </div>
          </div>
        </div>

        <div className="analytics-grid">
          {/* Monthly Revenue Trend */}
          <div className="analytics-card trend-card">
            <h4>📈 Monthly Revenue Trend</h4>
            <div className="trend-chart">
              {advancedAnalytics.monthlyTrend.map((month, index) => (
                <div key={index} className="trend-bar">
                  <div
                    className="trend-fill"
                    style={{
                      height: `${
                        (month.revenue /
                          Math.max(
                            ...advancedAnalytics.monthlyTrend.map(
                              (m) => m.revenue
                            )
                          )) *
                        100
                      }%`,
                    }}
                  ></div>
                  <div className="trend-label">
                    <span className="trend-month">{month.date}</span>
                    <span className="trend-value">
                      ${month.revenue.toFixed(0)}
                    </span>
                    <span className="trend-orders">{month.orders} orders</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Performing Products */}
          <div className="analytics-card">
            <h4>🏆 Top Performing Products</h4>
            <div className="top-performers-list">
              {advancedAnalytics.topPerformers
                .slice(0, 5)
                .map((product, index) => (
                  <div key={index} className="performer-item">
                    <div className="performer-rank">#{index + 1}</div>
                    <div className="performer-details">
                      <div className="performer-name">{product.name}</div>
                      <div className="performer-metrics">
                        <span className="metric-pill revenue">
                          ${product.totalRevenue.toFixed(0)}
                        </span>
                        <span className="metric-pill quantity">
                          {product.totalQuantity} sold
                        </span>
                        <span
                          className={`metric-pill margin ${
                            product.profitMargin > 0 ? "positive" : "negative"
                          }`}
                        >
                          {product.profitMargin.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Size Distribution */}
          <div className="analytics-card">
            <h4>👕 Size Distribution</h4>
            <div className="size-distribution">
              {advancedAnalytics.topSizes.map(([size, count], index) => (
                <div key={index} className="size-item">
                  <div className="size-info">
                    <span className="size-label">{size}</span>
                    <span className="size-count">{count} sold</span>
                  </div>
                  <div className="size-bar">
                    <div
                      className="size-fill"
                      style={{
                        width: `${
                          (count / advancedAnalytics.topSizes[0][1]) * 100
                        }%`,
                      }}
                    ></div>
                  </div>
                  <span className="size-percentage">
                    {(
                      (count /
                        advancedAnalytics.topSizes.reduce(
                          (sum, [, c]) => sum + c,
                          0
                        )) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Best Selling Days */}
          <div className="analytics-card">
            <h4>📅 Best Selling Days</h4>
            <div className="best-days">
              {advancedAnalytics.bestDays.map((day, index) => (
                <div key={index} className="day-item">
                  <div className="day-rank">#{index + 1}</div>
                  <div className="day-info">
                    <span className="day-name">{day.day}</span>
                    <span className="day-revenue">
                      ${day.revenue.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Profit Analysis */}
          <div className="analytics-card summary-card">
            <h4>💡 Business Insights</h4>
            <div className="insights-list">
              <div className="insight-item">
                <div className="insight-icon">📊</div>
                <div className="insight-text">
                  <strong>{advancedAnalytics.profitableProducts}</strong> out of{" "}
                  {advancedAnalytics.totalProducts} products are profitable
                </div>
              </div>

              <div className="insight-item">
                <div className="insight-icon">🎯</div>
                <div className="insight-text">
                  Top 3 products generate{" "}
                  <strong>
                    $
                    {advancedAnalytics.topPerformers
                      .slice(0, 3)
                      .reduce((sum, p) => sum + p.totalRevenue, 0)
                      .toFixed(0)}
                  </strong>
                  (
                  {(
                    (advancedAnalytics.topPerformers
                      .slice(0, 3)
                      .reduce((sum, p) => sum + p.totalRevenue, 0) /
                      data.summary.totalRevenue) *
                    100
                  ).toFixed(1)}
                  % of total)
                </div>
              </div>

              <div className="insight-item">
                <div className="insight-icon">📈</div>
                <div className="insight-text">
                  {advancedAnalytics.monthlyTrend.length > 1 &&
                  advancedAnalytics.monthlyTrend[
                    advancedAnalytics.monthlyTrend.length - 1
                  ].revenue >
                    advancedAnalytics.monthlyTrend[
                      advancedAnalytics.monthlyTrend.length - 2
                    ].revenue
                    ? "Revenue is trending upward"
                    : "Revenue needs attention"}
                </div>
              </div>

              {advancedAnalytics.topSizes.length > 0 && (
                <div className="insight-item">
                  <div className="insight-icon">👕</div>
                  <div className="insight-text">
                    <strong>{advancedAnalytics.topSizes[0][0]}</strong> is your
                    most popular size ({advancedAnalytics.topSizes[0][1]} units
                    sold)
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderOrders = () => {
    // Filter and sort orders
    const getFilteredOrders = () => {
      let filtered = [...data.orders];

      // Search filter
      if (orderFilters.searchTerm) {
        const search = orderFilters.searchTerm.toLowerCase();
        filtered = filtered.filter(
          (order) =>
            order.id.toLowerCase().includes(search) ||
            order.items.some(
              (item) =>
                item.product.toLowerCase().includes(search) ||
                item.variant.toLowerCase().includes(search)
            )
        );
      }

      // Amount filter
      if (orderFilters.minAmount) {
        filtered = filtered.filter(
          (order) => order.total >= parseFloat(orderFilters.minAmount)
        );
      }
      if (orderFilters.maxAmount) {
        filtered = filtered.filter(
          (order) => order.total <= parseFloat(orderFilters.maxAmount)
        );
      }

      // Sort orders
      filtered.sort((a, b) => {
        let aValue, bValue;
        switch (orderFilters.sortBy) {
          case "id":
            aValue = a.id.toLowerCase();
            bValue = b.id.toLowerCase();
            break;
          case "total":
            aValue = a.total;
            bValue = b.total;
            break;
          case "date":
          default:
            aValue = new Date(a.date).getTime();
            bValue = new Date(b.date).getTime();
            break;
        }

        if (orderFilters.sortOrder === "asc") {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      return filtered;
    };

    const filteredOrders = getFilteredOrders();

    // Update processed orders for pagination
    if (JSON.stringify(processedOrders) !== JSON.stringify(filteredOrders)) {
      setProcessedOrders(filteredOrders);
      ordersPagination.resetPagination();
    }

    // Use paginated data for display
    const currentOrders =
      ordersPagination.paginatedData.length > 0
        ? ordersPagination.paginatedData
        : filteredOrders.slice(0, 25); // Fallback for initial render

    return (
      <div className="orders-section" ref={ordersRef}>
        {/* Pagination at top */}
        {filteredOrders.length > 0 && (
          <Pagination
            currentPage={ordersPagination.currentPage}
            totalPages={ordersPagination.totalPages}
            pageSize={ordersPagination.pageSize}
            totalItems={filteredOrders.length}
            onPageChange={ordersPagination.handlePageChange}
            onPageSizeChange={ordersPagination.handlePageSizeChange}
            itemName="orders"
            scrollTargetRef={ordersRef}
          />
        )}

        <div className="orders-header">
          <h3>Orders ({filteredOrders.length})</h3>

          {/* Enhanced Search and Filter Controls */}
          <div className="orders-filters">
            <div className="filters-header">
              <span>🔍</span>
              <h5>Search & Filter Orders</h5>
            </div>

            <div className="filters-content">
              {/* Search Section */}
              <div className="search-section">
                <label className="search-label">
                  <span>🔎</span>
                  Search by order ID, product, or variant
                </label>
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Type to search orders..."
                    value={orderFilters.searchTerm}
                    onChange={(e) =>
                      setOrderFilters((prev) => ({
                        ...prev,
                        searchTerm: e.target.value,
                      }))
                    }
                    className="search-input"
                  />
                </div>
              </div>

              {/* Filter Controls */}
              <div className="filters-row">
                <div className="filter-group">
                  <label className="filter-label">Sort By</label>
                  <select
                    value={orderFilters.sortBy}
                    onChange={(e) =>
                      setOrderFilters((prev) => ({
                        ...prev,
                        sortBy: e.target.value,
                      }))
                    }
                    className="sort-select"
                  >
                    <option value="date">📅 Date</option>
                    <option value="id">🆔 Order ID</option>
                    <option value="total">💰 Amount</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label className="filter-label">Direction</label>
                  <div className="sort-direction">
                    <button
                      onClick={() =>
                        setOrderFilters((prev) => ({
                          ...prev,
                          sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
                        }))
                      }
                      className={`sort-toggle ${orderFilters.sortOrder}`}
                      title={`Sort ${
                        orderFilters.sortOrder === "asc"
                          ? "Ascending"
                          : "Descending"
                      }`}
                    >
                      {orderFilters.sortOrder === "asc" ? "⬆️" : "⬇️"}
                    </button>
                    <span className="sort-label">
                      {orderFilters.sortOrder === "asc"
                        ? "Low to High"
                        : "High to Low"}
                    </span>
                  </div>
                </div>

                <div className="filter-group">
                  <label className="filter-label">Amount Range ($)</label>
                  <div className="amount-filters">
                    <input
                      type="number"
                      placeholder="Min"
                      value={orderFilters.minAmount}
                      onChange={(e) =>
                        setOrderFilters((prev) => ({
                          ...prev,
                          minAmount: e.target.value,
                        }))
                      }
                      className="amount-filter"
                    />
                    <span className="amount-separator">to</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={orderFilters.maxAmount}
                      onChange={(e) =>
                        setOrderFilters((prev) => ({
                          ...prev,
                          maxAmount: e.target.value,
                        }))
                      }
                      className="amount-filter"
                    />
                  </div>
                </div>
              </div>

              {/* Filter Status & Actions */}
              {(orderFilters.searchTerm ||
                orderFilters.minAmount ||
                orderFilters.maxAmount) && (
                <div className="filter-status">
                  Active filters:
                  {orderFilters.searchTerm &&
                    ` Search: "${orderFilters.searchTerm}"`}
                  {orderFilters.minAmount && ` Min: $${orderFilters.minAmount}`}
                  {orderFilters.maxAmount && ` Max: $${orderFilters.maxAmount}`}
                </div>
              )}

              <div className="filters-actions">
                <button
                  onClick={() =>
                    setOrderFilters({
                      searchTerm: "",
                      sortBy: "date",
                      sortOrder: "desc",
                      minAmount: "",
                      maxAmount: "",
                    })
                  }
                  className="clear-filters"
                  disabled={
                    !orderFilters.searchTerm &&
                    !orderFilters.minAmount &&
                    !orderFilters.maxAmount
                  }
                >
                  🧹 Clear All Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="orders-list">
          {currentOrders.length > 0 ? (
            currentOrders.map((order, index) => (
              <div key={index} className="order-card">
                <div className="order-header">
                  <span className="order-id">{order.id}</span>
                  <span className="order-date">
                    {new Date(order.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="order-total">${order.total.toFixed(2)}</div>
                <div className="order-items">
                  {order.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="order-item">
                      {item.quantity}x {item.product} - {item.variant}
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="no-orders">
              <p>No orders match your current filters.</p>
            </div>
          )}
        </div>

        {/* Pagination at bottom for orders */}
        {filteredOrders.length > 0 && (
          <Pagination
            currentPage={ordersPagination.currentPage}
            totalPages={ordersPagination.totalPages}
            pageSize={ordersPagination.pageSize}
            totalItems={filteredOrders.length}
            onPageChange={ordersPagination.handlePageChange}
            onPageSizeChange={ordersPagination.handlePageSizeChange}
            itemName="orders"
            scrollTargetRef={ordersRef}
          />
        )}
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Order Analytics Dashboard</h2>
        <div className="tabs">
          <button
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={activeTab === "products" ? "active" : ""}
            onClick={() => setActiveTab("products")}
          >
            Products
          </button>
          <button
            className={activeTab === "profits" ? "active" : ""}
            onClick={() => setActiveTab("profits")}
          >
            Profit Calculator
          </button>
          <button
            className={activeTab === "analytics" ? "active" : ""}
            onClick={() => setActiveTab("analytics")}
          >
            Analytics
          </button>
          <button
            className={activeTab === "orders" ? "active" : ""}
            onClick={() => setActiveTab("orders")}
          >
            Orders
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {activeTab === "overview" && renderOverview()}
        {activeTab === "products" && renderProducts()}
        {activeTab === "profits" && renderProfitCalculator()}
        {activeTab === "analytics" && renderAnalytics()}
        {activeTab === "orders" && renderOrders()}
      </div>
    </div>
  );
};

export default Dashboard;
