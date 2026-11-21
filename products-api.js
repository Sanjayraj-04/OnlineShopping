
const PROJECT_ID = "shopez-7eaaa";

const BASE_URL =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const PRODUCTS_URL = `${BASE_URL}/products`;

// Convert JavaScript values into Firestore REST format
function toFirestoreFields(data) {
    const fields = {};

    for (const [key, value] of Object.entries(data)) {
        if (typeof value === "string") {
            fields[key] = { stringValue: value };
        } else if (typeof value === "number") {
            fields[key] = Number.isInteger(value)
                ? { integerValue: String(value) }
                : { doubleValue: value };
        } else if (typeof value === "boolean") {
            fields[key] = { booleanValue: value };
        } else if (value === null) {
            fields[key] = { nullValue: null };
        } else {
            throw new Error(`Unsupported value: ${key}`);
        }
    }

    return fields;
}

// Convert Firestore values into JavaScript values
function fromFirestoreFields(fields) {
    const product = {};

    for (const [key, value] of Object.entries(fields || {})) {
        if ("stringValue" in value) {
            product[key] = value.stringValue;
        } else if ("integerValue" in value) {
            product[key] = Number(value.integerValue);
        } else if ("doubleValue" in value) {
            product[key] = value.doubleValue;
        } else if ("booleanValue" in value) {
            product[key] = value.booleanValue;
        } else if ("nullValue" in value) {
            product[key] = null;
        }
    }

    return product;
}

// CREATE PRODUCT
async function createProduct(productId, productData) {
    try {
        const response = await axios.post(
            `${PRODUCTS_URL}?documentId=${encodeURIComponent(productId)}`,
            {
                fields: toFirestoreFields({
                    ...productData,
                    id: productId
                })
            }
        );

        return fromFirestoreFields(response.data.fields);

    } catch (error) {
        console.error("Create error:", error.response?.data || error.message);
        throw error;
    }
}

// READ ONE PRODUCT
async function getProduct(productId) {
    try {
        const response = await axios.get(
            `${PRODUCTS_URL}/${encodeURIComponent(productId)}`
        );

        return fromFirestoreFields(response.data.fields);

    } catch (error) {
        console.error("Read error:", error.response?.data || error.message);
        throw error;
    }
}

// READ ALL PRODUCTS
async function getAllProducts() {
    try {
        const response = await axios.get(PRODUCTS_URL);

        return (response.data.documents || []).map(document => {
            const product = fromFirestoreFields(document.fields);
            product.id = document.name.split("/").pop();
            return product;
        });

    } catch (error) {
        console.error("Read all error:", error.response?.data || error.message);
        throw error;
    }
}

// UPDATE PRODUCT
async function updateProduct(productId, updatedData) {
    try {
        if (Object.hasOwn(updatedData, "id")) {
            throw new Error("Product ID cannot be updated");
        }

        const params = new URLSearchParams();

        Object.keys(updatedData).forEach(field => {
            params.append("updateMask.fieldPaths", field);
        });

        const response = await axios.patch(
            `${PRODUCTS_URL}/${encodeURIComponent(productId)}?${params}`,
            {
                fields: toFirestoreFields(updatedData)
            }
        );

        return fromFirestoreFields(response.data.fields);

    } catch (error) {
        console.error("Update error:", error.response?.data || error.message);
        throw error;
    }
}

// DELETE PRODUCT
async function deleteProduct(productId) {
    try {
        await axios.delete(
            `${PRODUCTS_URL}/${encodeURIComponent(productId)}`
        );

        return {
            success: true,
            message: "Product deleted successfully"
        };

    } catch (error) {
        console.error("Delete error:", error.response?.data || error.message);
        throw error;
    }
}

// Expose API functions to the frontend
window.ProductsAPI = {
    createProduct,
    getProduct,
    getAllProducts,
    updateProduct,
    deleteProduct
};

console.log("ShopEZ Products API loaded successfully");
