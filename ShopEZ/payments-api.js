
const PAYMENTS_URL =
    "https://firestore.googleapis.com/v1/projects/shopez-7eaaa/databases/(default)/documents/payments";

// Convert JavaScript data to Firestore format
function toPaymentFirestoreFormat(data) {
    const fields = {};

    for (const key in data) {
        const value = data[key];

        if (typeof value === "number") {
            fields[key] = { doubleValue: value };
        } else {
            fields[key] = { stringValue: String(value) };
        }
    }

    return { fields };
}

// Convert Firestore data to JavaScript format
function fromPaymentFirestoreFormat(document) {
    const result = {};

    for (const key in document.fields) {
        const field = document.fields[key];

        if (field.stringValue !== undefined) {
            result[key] = field.stringValue;
        } else if (field.integerValue !== undefined) {
            result[key] = Number(field.integerValue);
        } else if (field.doubleValue !== undefined) {
            result[key] = Number(field.doubleValue);
        }
    }

    return result;
}

const PaymentsAPI = {

    // CREATE PAYMENT
    async createPayment(paymentId, paymentData) {
        const payment = {
            id: paymentId,
            payment_status: "Paid",
            created_at: new Date().toISOString(),
            ...paymentData
        };

        const response = await axios.post(
            `${PAYMENTS_URL}?documentId=${paymentId}`,
            toPaymentFirestoreFormat(payment)
        );

        return fromPaymentFirestoreFormat(response.data);
    },

    // READ ONE PAYMENT
    async getPayment(paymentId) {
        const response = await axios.get(
            `${PAYMENTS_URL}/${paymentId}`
        );

        return fromPaymentFirestoreFormat(response.data);
    },

    // READ ALL PAYMENTS
    async getAllPayments() {
        const response = await axios.get(PAYMENTS_URL);

        const documents = response.data.documents || [];

        return documents.map(document =>
            fromPaymentFirestoreFormat(document)
        );
    },

    // READ PAYMENTS BY CUSTOMER
    async getPaymentsByCustomer(customerId) {
        const payments = await this.getAllPayments();

        return payments.filter(
            payment => payment.customer_id === customerId
        );
    },

    // READ PAYMENTS BY ORDER
    async getPaymentsByOrder(orderId) {
        const payments = await this.getAllPayments();

        return payments.filter(
            payment => payment.order_id === orderId
        );
    }
};

window.PaymentsAPI = PaymentsAPI;
