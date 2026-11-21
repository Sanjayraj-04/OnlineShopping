
const REPORTS_BASE_URL =
    "https://firestore.googleapis.com/v1/projects/shopez-7eaaa/databases/(default)/documents";

// ======================================
// FIRESTORE DATA CONVERSION
// ======================================

// Convert Firestore values into JavaScript values
function convertReportDocument(document) {
    const result = {};

    for (const key in document.fields) {
        const field = document.fields[key];

        if (field.stringValue !== undefined) {
            result[key] = field.stringValue;
        } else if (field.integerValue !== undefined) {
            result[key] = Number(field.integerValue);
        } else if (field.doubleValue !== undefined) {
            result[key] = Number(field.doubleValue);
        } else if (field.booleanValue !== undefined) {
            result[key] = field.booleanValue;
        }
    }

    return result;
}

// Read all documents from a collection
async function getReportCollection(collectionName) {
    const response = await axios.get(
        `${REPORTS_BASE_URL}/${collectionName}`
    );

    return (response.data.documents || []).map(
        convertReportDocument
    );
}

// ======================================
// DATE RANGE VALIDATION
// ======================================

// Check whether a date falls within the selected range
function isWithinDateRange(dateValue, fromDate, toDate) {
    if (!dateValue) return false;

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return false;

    const start = new Date(`${fromDate}T00:00:00`);
    const end = new Date(`${toDate}T23:59:59.999`);

    return date >= start && date <= end;
}

// ======================================
// REPORTS API
// ======================================

const ReportsAPI = {

    // ==================================
    // CUSTOMER REPORTS
    // ==================================

    // Get all customers
    async getAllCustomerReport() {
        return await getReportCollection("customers");
    },

    // Get top 10 customers by purchase amount
    async getTop10Customers(fromDate, toDate) {
        const [customers, orders] = await Promise.all([
            getReportCollection("customers"),
            getReportCollection("orders")
        ]);

        const totals = {};

        orders
            .filter(order =>
                isWithinDateRange(
                    order.created_at,
                    fromDate,
                    toDate
                )
            )
            .forEach(order => {
                const id = order.customer_id;

                totals[id] =
                    (totals[id] || 0) +
                    Number(order.total_amount || 0);
            });

        return customers
            .map(customer => ({
                ...customer,
                total_purchase: totals[customer.id] || 0
            }))
            .sort((a, b) =>
                b.total_purchase - a.total_purchase
            )
            .slice(0, 10);
    },

    // Cash purchase report
    async getCashPurchaseReport(fromDate, toDate) {
        const payments = await getReportCollection("payments");

        return payments.filter(payment =>
            payment.payment_method === "Cash" &&
            isWithinDateRange(
                payment.created_at,
                fromDate,
                toDate
            )
        );
    },

    // Credit purchase report
    async getCreditPurchaseReport(fromDate, toDate) {
        const payments = await getReportCollection("payments");

        return payments.filter(payment =>
            payment.payment_method === "Credit" &&
            isWithinDateRange(
                payment.created_at,
                fromDate,
                toDate
            )
        );
    },

    // ==================================
    // INVENTORY REPORTS
    // ==================================

    // Current stock - all products
    async getAllInventoryReport() {
        return await getReportCollection("products");
    },

    // Current stock - category-wise
    async getInventoryByCategory(categoryId) {
        const products = await getReportCollection("products");

        return products.filter(
            product => product.cat_id === categoryId
        );
    },

    // High stock - quantity greater than 100
    async getHighStockReport() {
        const products = await getReportCollection("products");

        return products.filter(
            product => Number(product.qty) > 100
        );
    },

    // Low stock - quantity less than 15
    async getLowStockReport() {
        const products = await getReportCollection("products");

        return products.filter(
            product => Number(product.qty) < 15
        );
    },

    // ==================================
    // SALES REPORTS
    // ==================================

    // Sales within a date range
    async getSalesByDate(fromDate, toDate) {
        const orders = await getReportCollection("orders");

        return orders.filter(order =>
            isWithinDateRange(
                order.created_at,
                fromDate,
                toDate
            )
        );
    },

    // Sales by payment method
    async getSalesByPaymentMethod(
        fromDate,
        toDate,
        paymentMethod
    ) {
        const orders = await this.getSalesByDate(
            fromDate,
            toDate
        );

        return orders.filter(order =>
            order.payment_method === paymentMethod
        );
    },

    // Sales summary by category
    async getSalesByCategory(
        fromDate,
        toDate,
        categoryId
    ) {
        const [orders, products] = await Promise.all([
            this.getSalesByDate(fromDate, toDate),
            getReportCollection("products")
        ]);

        // Get products belonging to the selected category
        const categoryProducts = products.filter(
            product => product.cat_id === categoryId
        );

        const productIds = new Set(
            categoryProducts.map(product => product.id)
        );

        let totalQuantitySold = 0;
        let totalSales = 0;

        const soldItems = [];

        orders.forEach(order => {
            let items = order.items;

            // Convert JSON string into an array
            if (typeof items === "string") {
                try {
                    items = JSON.parse(items);
                } catch (error) {
                    return;
                }
            }

            if (!Array.isArray(items)) return;

            items.forEach(item => {
                if (!productIds.has(item.product_id)) {
                    return;
                }

                const quantity = Number(item.quantity || 0);
                const price = Number(item.price || 0);
                const amount = quantity * price;

                totalQuantitySold += quantity;
                totalSales += amount;

                soldItems.push({
                    product_id: item.product_id,
                    title: item.title,
                    quantity_sold: quantity,
                    price: price,
                    total_sales: amount
                });
            });
        });

        return [{
            category_id: categoryId,
            total_quantity_sold: totalQuantitySold,
            total_sales: totalSales,
            items: soldItems
        }];
    },

    // ==================================
    // TOP AND BOTTOM SELLING ITEMS
    // ==================================

    // Top 10 selling items
    async getTop10SellingItems(fromDate, toDate) {
        return await this.getSellingItems(
            fromDate,
            toDate,
            "top"
        );
    },

    // Bottom 10 selling items
    async getBottom10SellingItems(fromDate, toDate) {
        return await this.getSellingItems(
            fromDate,
            toDate,
            "bottom"
        );
    },

    // Calculate item sales quantities
    async getSellingItems(fromDate, toDate, sortType) {
        const orders = await this.getSalesByDate(
            fromDate,
            toDate
        );

        const totals = {};

        orders.forEach(order => {
            let items = order.items;

            if (typeof items === "string") {
                try {
                    items = JSON.parse(items);
                } catch (error) {
                    return;
                }
            }

            if (!Array.isArray(items)) return;

            items.forEach(item => {
                const id = item.product_id;

                totals[id] =
                    (totals[id] || 0) +
                    Number(item.quantity || 0);
            });
        });

        const products = await getReportCollection("products");

        const result = products.map(product => ({
            product_id: product.id,
            title: product.title,
            quantity_sold: totals[product.id] || 0
        }));

        result.sort((a, b) =>
            sortType === "top"
                ? b.quantity_sold - a.quantity_sold
                : a.quantity_sold - b.quantity_sold
        );

        return result.slice(0, 10);
    }
};

// Make ReportsAPI available to HTML test pages
window.ReportsAPI = ReportsAPI;
