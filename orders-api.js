
const FIRESTORE_URL =
    "https://firestore.googleapis.com/v1/projects/shopez-7eaaa/databases/(default)/documents";

const ORDERS_URL = `${FIRESTORE_URL}/orders`;

// Convert JavaScript data into Firestore format
function toOrderFirestoreFormat(data) {
    const fields = {};

    for (const key in data) {
        const value = data[key];

        if (typeof value === "number") {
            fields[key] = {
                doubleValue: value
            };
        } else if (typeof value === "boolean") {
            fields[key] = {
                booleanValue: value
            };
        } else {
            fields[key] = {
                stringValue: String(value)
            };
        }
    }

    return { fields };
}

// Convert Firestore document into JavaScript data
function fromOrderFirestoreFormat(document) {
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

    // Convert stored items JSON back into an array
    if (result.items) {
        result.items = JSON.parse(result.items);
    }

    return result;
}

const OrdersAPI = {

    // CREATE ORDER
    async createOrder(orderId, orderData) {
        const order = {
            id: orderId,
            status: "Pending",
            created_at: new Date().toISOString(),
            ...orderData,

            // Store the product list as JSON text
            items: JSON.stringify(orderData.items)
        };

        const response = await axios.post(
            `${ORDERS_URL}?documentId=${orderId}`,
            toOrderFirestoreFormat(order)
        );

        return fromOrderFirestoreFormat(response.data);
    },

    // READ ONE ORDER
    async getOrder(orderId) {
        const response = await axios.get(
            `${ORDERS_URL}/${orderId}`
        );

        return fromOrderFirestoreFormat(response.data);
    },

    // READ ALL ORDERS
    async getAllOrders() {
        const response = await axios.get(ORDERS_URL);

        const documents = response.data.documents || [];

        return documents.map(document =>
            fromOrderFirestoreFormat(document)
        );
    },

    // READ ORDERS BY CUSTOMER
    async getOrdersByCustomer(customerId) {
        const allOrders = await this.getAllOrders();

        return allOrders.filter(
            order => order.customer_id === customerId
        );
    },

    // UPDATE ORDER STATUS
    async updateOrderStatus(orderId, status) {
        const allowedStatuses = [
            "Pending",
            "Confirmed",
            "Shipped",
            "Delivered",
            "Cancelled"
        ];

        if (!allowedStatuses.includes(status)) {
            throw new Error("Invalid order status");
        }

        const params = new URLSearchParams();
        params.append("updateMask.fieldPaths", "status");

        const response = await axios.patch(
            `${ORDERS_URL}/${orderId}?${params.toString()}`,
            toOrderFirestoreFormat({ status })
        );

        return fromOrderFirestoreFormat(response.data);
    }
};

window.OrdersAPI = OrdersAPI;
