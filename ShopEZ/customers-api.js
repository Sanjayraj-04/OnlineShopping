
const FIRESTORE_URL =
    "https://firestore.googleapis.com/v1/projects/shopez-7eaaa/databases/(default)/documents";

const CUSTOMERS_URL = `${FIRESTORE_URL}/customers`;

// Convert JavaScript data into Firestore format
function toCustomerFirestoreFormat(data) {
    const fields = {};

    for (const key in data) {
        if (typeof data[key] === "number") {
            fields[key] = {
                integerValue: String(data[key])
            };
        } else {
            fields[key] = {
                stringValue: String(data[key])
            };
        }
    }

    return { fields };
}

// Convert Firestore data into JavaScript format
function fromCustomerFirestoreFormat(document) {
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

const CustomersAPI = {

    // CREATE CUSTOMER
    async createCustomer(customerId, customerData) {
        const customer = {
            id: customerId,
            credit_limit: 0,
            ...customerData
        };

        const response = await axios.post(
            `${CUSTOMERS_URL}?documentId=${customerId}`,
            toCustomerFirestoreFormat(customer)
        );

        return fromCustomerFirestoreFormat(response.data);
    },

    // READ ONE CUSTOMER
    async getCustomer(customerId) {
        const response = await axios.get(
            `${CUSTOMERS_URL}/${customerId}`
        );

        return fromCustomerFirestoreFormat(response.data);
    },

    // READ ALL CUSTOMERS
    async getAllCustomers() {
        const response = await axios.get(CUSTOMERS_URL);

        const documents = response.data.documents || [];

        return documents.map(document =>
            fromCustomerFirestoreFormat(document)
        );
    },

    // UPDATE CUSTOMER
    async updateCustomer(customerId, updatedData) {
        const data = { ...updatedData };
        delete data.id;

        const params = new URLSearchParams();

        Object.keys(data).forEach(key => {
            params.append("updateMask.fieldPaths", key);
        });

        const response = await axios.patch(
            `${CUSTOMERS_URL}/${customerId}?${params.toString()}`,
            toCustomerFirestoreFormat(data)
        );

        return fromCustomerFirestoreFormat(response.data);
    },

    // UPDATE CREDIT LIMIT
    async updateCreditLimit(customerId, creditLimit) {
        if (typeof creditLimit !== "number" || creditLimit < 0) {
            throw new Error("Credit limit must be a non-negative number");
        }

        return await this.updateCustomer(customerId, {
            credit_limit: creditLimit
        });
    },

    // DELETE CUSTOMER
    async deleteCustomer(customerId) {
        await axios.delete(`${CUSTOMERS_URL}/${customerId}`);

        return {
            success: true,
            message: "Customer deleted successfully"
        };
    }
};

window.CustomersAPI = CustomersAPI;
