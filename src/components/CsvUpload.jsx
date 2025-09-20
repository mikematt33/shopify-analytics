import { useState } from "react";
import Papa from "papaparse";
import "./CsvUpload.css";

const CsvUpload = ({
  onDataLoaded,
  buttonText = "Upload Shopify Orders CSV",
  compact = false,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a CSV file");
      return;
    }

    setLoading(true);
    setProgress(0);
    setError("");
    setSuccess("");

    // Debug file information
    console.log("📁 File info:", {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString(),
    });

    // Read a sample of the file content to debug
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      console.log(
        "📄 File content preview (first 500 chars):",
        text.substring(0, 500)
      );
      console.log(
        "📄 File content preview (lines 1-3):",
        text.split("\n").slice(0, 3)
      );
      console.log("📄 Total lines in file:", text.split("\n").length);
      console.log(
        "📄 Line endings detected:",
        text.includes("\r\n")
          ? "CRLF (\\r\\n)"
          : text.includes("\r")
          ? "CR (\\r)"
          : "LF (\\n)"
      );

      // Manual CSV parsing test
      console.log("🧪 Testing manual CSV parsing...");
      const lines = text.split(/\r?\n/);
      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().replace(/^"|"$/g, ""));
      console.log("🧪 Manual headers:", headers);
      console.log(
        "🧪 Manual data sample (line 2):",
        lines[1] ? lines[1].substring(0, 200) + "..." : "No data line"
      );

      // Try Papa Parse with the text directly instead of file
      console.log("🧪 Testing Papa Parse with text instead of file...");
      Papa.parse(text, {
        header: true,
        skipEmptyLines: "greedy",
        complete: (result) => {
          console.log("🧪 Papa Parse with text result:", {
            dataLength: result.data.length,
            errors: result.errors,
            fields: result.meta.fields,
            firstRow: result.data[0],
          });

          if (result.data.length > 0) {
            console.log(
              "✅ SUCCESS! Papa Parse with text worked. Using this approach."
            );
            handleParseResult(result);
          } else {
            console.log(
              "❌ Papa Parse with text also failed. Trying Papa Parse with file..."
            );
            parseWithPapa();
          }
        },
      });
    };
    reader.readAsText(file);

    // Helper function to handle Papa Parse results
    const handleParseResult = (result) => {
      setProgress(60); // 60% after parsing complete

      console.log("🔍 Raw Papa Parse result:", {
        dataLength: result.data.length,
        errors: result.errors,
        meta: result.meta,
        fields: result.meta.fields,
        delimiter: result.meta.delimiter,
        linebreak: result.meta.linebreak,
        aborted: result.meta.aborted,
        truncated: result.meta.truncated,
        cursor: result.meta.cursor,
        firstRow: result.data[0],
        lastRow: result.data[result.data.length - 1],
      });

      if (result.errors.length > 0) {
        console.warn("Papa Parse errors:", result.errors);
        setLoading(false);
        setProgress(0);
        setError("Error parsing CSV: " + result.errors[0].message);
        return;
      }

      console.log("CSV parsed successfully. Row count:", result.data.length);

      // Continue with the rest of the parsing logic...
      continueWithValidation(result.data);
    };

    // Helper function to continue with validation and processing
    const continueWithValidation = (data) => {
      // Filter out empty rows more aggressively
      const validRows = data.filter((row, index) => {
        const isValid =
          row &&
          Object.values(row).some(
            (value) => value && value.toString().trim() !== ""
          );

        // Debug first few rows
        if (index < 5) {
          console.log(`Row ${index + 1} validation:`, {
            isValid,
            row,
            values: Object.values(row),
            nonEmptyValues: Object.values(row).filter(
              (v) => v && v.toString().trim() !== ""
            ),
          });
        }

        return isValid;
      });

      console.log("Valid rows after filtering:", validRows.length);
      console.log("First valid row sample:", validRows[0]);

      // Show some sample valid rows
      if (validRows.length > 0) {
        console.log("Sample of valid rows:", validRows.slice(0, 3));
      }

      // Continue with existing validation logic...
      handleValidatedRows(validRows);
    };

    // Helper function to handle validated rows
    const handleValidatedRows = (validRows) => {
      // Validate CSV structure
      if (validRows.length === 0) {
        setLoading(false);
        setProgress(0);
        setError("CSV file appears to be empty or contains no valid data");
        return;
      }

      const firstRow = validRows[0];
      const availableFields = Object.keys(firstRow);
      console.log("Available CSV fields:", availableFields);

      // Check for order ID fields (more flexible)
      const orderIdFields = [
        "Name",
        "Order",
        "Order Number",
        "Order ID",
        "#",
        "Order Name",
      ];
      const hasOrderId = orderIdFields.some((field) =>
        availableFields.some(
          (key) =>
            key.toLowerCase().includes(field.toLowerCase()) || key === field
        )
      );

      // Check for product fields (more flexible)
      const productFields = [
        "Lineitem name",
        "Product Title",
        "Title",
        "Product Name",
        "Item Name",
        "Product",
      ];
      const hasProduct = productFields.some((field) =>
        availableFields.some(
          (key) =>
            key.toLowerCase().includes(field.toLowerCase()) || key === field
        )
      );

      if (!hasOrderId || !hasProduct) {
        setLoading(false);
        setProgress(0);
        setError(
          `CSV validation failed. Please ensure your CSV contains order and product information.
          
          Looking for order ID in: ${orderIdFields.join(", ")}
          Looking for product name in: ${productFields.join(", ")}
          
          Found fields in your CSV: ${availableFields.join(", ")}
          
          ${
            !hasOrderId
              ? "❌ No order ID field found. "
              : "✅ Order ID field found. "
          }
          ${
            !hasProduct
              ? "❌ No product field found."
              : "✅ Product field found."
          }`
        );
        return;
      }

      setProgress(80); // 80% after validation

      try {
        // Process the parsed data with valid rows
        const processedData = processShopifyData(validRows);
        setProgress(100);

        console.log("Processed data:", processedData);

        // Check if any data was actually parsed
        const orderCount = processedData.orders.length;

        if (orderCount === 0 && validRows.length > 0) {
          setError(
            `No orders could be parsed from the CSV file. 
            
            This usually means the field names don't match what we expect. 
            
            Expected field names include:
            • Order ID: 'Name', 'Order', 'Order Number', 'Order ID', '#', 'Order Name'
            • Product Name: 'Lineitem name', 'Product Title', 'Title', 'Product Name', 'Item Name', 'Product'
            • Quantity: 'Lineitem quantity', 'Quantity', 'Qty', 'Item Quantity'
            • Price: 'Lineitem price', 'Price', 'Unit Price', 'Item Price', 'Line Item Price'
            
            Found field names in your CSV: ${
              validRows.length > 0
                ? Object.keys(validRows[0]).join(", ")
                : "None"
            }
            
            Please check the console (F12) for more detailed parsing information.`
          );
          return;
        }

        // Show success message
        setSuccess(
          `Successfully loaded ${orderCount} orders with ${processedData.products.length} unique products!`
        );

        setTimeout(() => {
          onDataLoaded(processedData);
          setLoading(false);
          setProgress(0);
          setSuccess("");
        }, 2000);
      } catch (error) {
        console.error("Error processing data:", error);
        setLoading(false);
        setProgress(0);
        setError("Error processing data: " + error.message);
      }
    };

    const parseWithPapa = () => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: "greedy", // Skip all empty lines, even whitespace-only
        delimiter: ",",
        quoteChar: '"',
        escapeChar: '"',
        transformHeader: (header) => {
          // Clean and trim header names
          const cleaned = header.trim();
          console.log(`Header transformation: "${header}" -> "${cleaned}"`);
          return cleaned;
        },
        transform: (value) => {
          // Clean and trim all values
          if (typeof value === "string") {
            return value.trim();
          }
          return value;
        },
        step: (results, parser) => {
          // Update progress during parsing
          const progress = (parser._currentRow / parser._totalRows) * 50; // First 50% for parsing
          setProgress(Math.min(progress, 50));

          // Debug ALL rows during parsing
          console.log(`🔄 Parsing step - Row ${parser._currentRow}:`, {
            data: results.data,
            errors: results.errors,
            meta: results.meta,
          });
        },
        complete: (result) => {
          handleParseResult(result);
        },
        error: (error) => {
          setLoading(false);
          setProgress(0);
          setError("Error reading file: " + error.message);
        },
      });
    };

    // Actually call parseWithPapa if the text approach didn't work
    // This is handled in the reader.onload callback above
  };

  const processShopifyData = (data) => {
    const orders = {};
    const products = {};
    const seenEntries = new Set(); // Track duplicates
    let processedRows = 0;
    let skippedRows = 0;

    // Debug: Log available fields in the CSV
    if (data.length > 0) {
      console.log("CSV Headers detected:", Object.keys(data[0]));
      console.log("Sample row:", data[0]);
    }

    // Helper function to remove size variants from product names for grouping
    const normalizeProductName = (productTitle, variant) => {
      // Remove common size indicators
      const sizePattern = /\b(XS|S|M|L|XL|XXL|XXXL|2XL|3XL|\d+XL)\b/gi;
      const normalizedTitle = productTitle
        .replace(sizePattern, "")
        .trim()
        .replace(/\s+/g, " ");
      const normalizedVariant =
        variant.replace(sizePattern, "").trim().replace(/\s+/g, " ") ||
        "Default";

      return {
        displayName: productTitle, // Keep original for display
        groupName: normalizedTitle || productTitle, // Use for grouping
        displayVariant: variant,
        groupVariant: normalizedVariant,
      };
    };

    data.forEach((row, rowIndex) => {
      // More comprehensive field mapping for different Shopify export formats
      const orderId =
        row["Name"] ||
        row["Order"] ||
        row["Order Number"] ||
        row["Order ID"] ||
        row["#"] ||
        row["Order Name"];

      const productTitle =
        row["Lineitem name"] ||
        row["Product Title"] ||
        row["Title"] ||
        row["Product Name"] ||
        row["Item Name"] ||
        row["Product"];

      const quantity = parseInt(
        row["Lineitem quantity"] ||
          row["Quantity"] ||
          row["Qty"] ||
          row["Item Quantity"] ||
          "1"
      );

      const price = parseFloat(
        row["Lineitem price"] ||
          row["Price"] ||
          row["Unit Price"] ||
          row["Item Price"] ||
          row["Line Item Price"] ||
          "0"
      );

      const total = parseFloat(
        row["Total"] ||
          row["Order Total"] ||
          row["Line Total"] ||
          row["Amount"] ||
          (price * quantity).toString()
      );

      const orderDate =
        row["Created at"] ||
        row["Date"] ||
        row["Order Date"] ||
        row["Created At"] ||
        new Date().toISOString();

      const variant =
        row["Lineitem variant"] ||
        row["Variant"] ||
        row["Product Variant"] ||
        row["Size"] ||
        row["Option"] ||
        "Default";

      // Debug logging for problematic rows
      if (rowIndex < 3) {
        // Log first few rows for debugging
        console.log(`Row ${rowIndex + 1} parsed:`, {
          orderId,
          productTitle,
          quantity,
          price,
          total,
          variant,
          originalRow: row,
        });
      }

      const entryKey = `${orderId}-${productTitle}-${variant}`;

      if (seenEntries.has(entryKey)) {
        console.log(`Duplicate entry detected: ${entryKey}`);
        skippedRows++;
        return;
      }
      seenEntries.add(entryKey);

      // Enhanced debugging for missing data
      if (!orderId || !productTitle) {
        console.warn(`❌ Skipping row ${rowIndex + 1} with missing data:`, {
          orderId: orderId || "MISSING",
          productTitle: productTitle || "MISSING",
          availableFields: Object.keys(row),
          rowData: row,
        });

        // Show exactly which fields we tried to match
        if (!orderId) {
          console.warn(`🔍 Order ID not found. Tried fields:`, [
            "Name",
            "Order",
            "Order Number",
            "Order ID",
            "#",
            "Order Name",
          ]);
        }
        if (!productTitle) {
          console.warn(`🔍 Product title not found. Tried fields:`, [
            "Lineitem name",
            "Product Title",
            "Title",
            "Product Name",
            "Item Name",
            "Product",
          ]);
        }
        skippedRows++;
        return;
      }

      processedRows++;

      // Track orders
      if (!orders[orderId]) {
        orders[orderId] = {
          id: orderId,
          total: total,
          date: orderDate,
          items: [],
        };
      }

      // Add item to order
      orders[orderId].items.push({
        product: productTitle,
        variant: variant,
        quantity: quantity,
        price: price,
      });

      // Track products - group by normalized name (without sizes)
      const normalized = normalizeProductName(productTitle, variant);
      const productKey = `${normalized.groupName} - ${normalized.groupVariant}`;

      if (!products[productKey]) {
        products[productKey] = {
          name: normalized.groupName,
          variant: normalized.groupVariant,
          displayName: normalized.displayName, // Keep one example for display
          totalQuantity: 0,
          totalRevenue: 0,
          orders: [],
          originalVariants: new Set(), // Track all original variants
        };
      }

      // Track all original variants
      products[productKey].originalVariants.add(
        `${normalized.displayName} - ${normalized.displayVariant}`
      );

      products[productKey].totalQuantity += quantity;
      products[productKey].totalRevenue += price * quantity;
      if (!products[productKey].orders.includes(orderId)) {
        products[productKey].orders.push(orderId);
      }
    });

    const ordersList = Object.values(orders);
    const productsList = Object.values(products).map((product) => ({
      ...product,
      originalVariants: Array.from(product.originalVariants), // Convert Set to Array
    }));

    // Provide parsing feedback
    console.log("📊 Parsing results:", {
      totalRowsInCSV: data.length,
      rowsProcessedSuccessfully: processedRows,
      rowsSkipped: skippedRows,
      totalOrdersParsed: ordersList.length,
      totalProductsParsed: productsList.length,
      duplicatesSkipped: seenEntries.size - processedRows,
    });

    // If no data was parsed, provide helpful guidance
    if (ordersList.length === 0 && data.length > 0) {
      console.error(
        "No orders were successfully parsed. Check these common field names:"
      );
      console.error(
        "Expected fields: Order ID -> 'Name', 'Order', 'Order Number', 'Order ID', '#', 'Order Name'"
      );
      console.error(
        "Product Name -> 'Lineitem name', 'Product Title', 'Title', 'Product Name', 'Item Name', 'Product'"
      );
      console.error(
        "Available fields in your CSV:",
        data.length > 0 ? Object.keys(data[0]) : "None"
      );
    }

    return {
      orders: ordersList,
      products: productsList,
      summary: {
        totalOrders: ordersList.length,
        totalProducts: productsList.length,
        totalRevenue: ordersList.reduce((sum, order) => sum + order.total, 0),
        totalItems: productsList.reduce(
          (sum, product) => sum + product.totalQuantity,
          0
        ),
      },
    };
  };

  return (
    <div className={`csv-upload-container ${compact ? "compact" : ""}`}>
      <div
        className={`upload-area ${dragActive ? "drag-active" : ""} ${
          compact ? "compact" : ""
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id={compact ? "csv-file-compact" : "csv-file"}
          accept=".csv"
          onChange={handleChange}
          style={{ display: "none" }}
        />

        <label
          htmlFor={compact ? "csv-file-compact" : "csv-file"}
          className="upload-label"
        >
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Processing CSV...</p>
              {progress > 0 && (
                <div className="progress-container">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{Math.round(progress)}%</span>
                </div>
              )}
            </div>
          ) : success ? (
            <div className="success">
              <div className="success-icon">✅</div>
              <p>{success}</p>
            </div>
          ) : (
            <>
              <div className="upload-icon">{compact ? "📄" : "📊"}</div>
              <h3>{buttonText}</h3>
              {!compact && (
                <>
                  <p>Drag and drop your CSV file here, or click to select</p>
                  <p className="file-info">
                    Supports CSV files exported from Shopify
                  </p>
                </>
              )}
              {compact && <p>Click to select or drag CSV file</p>}
            </>
          )}
        </label>
      </div>

      {error && <div className="error">{error}</div>}
    </div>
  );
};

export default CsvUpload;
