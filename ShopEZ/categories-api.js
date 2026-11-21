
const FIRESTORE_URL =
    "https://firestore.googleapis.com/v1/projects/shopez-7eaaa/databases/(default)/documents";

const CATEGORIES_URL = `${FIRESTORE_URL}/categories`;

// Convert normal JavaScript data into Firestore format
function toFirestoreFormat(data) {
    const fields = {};

    for (const key in data) {
        fields[key] = {
            stringValue: String(data[key])
        };
    }

    return { fields };
}

// Convert Firestore data into normal JavaScript format
function fromFirestoreFormat(document) {
    const result = {};

    for (const key in document.fields) {
        result[key] = document.fields[key].stringValue;
    }

    return result;
}

const CategoriesAPI = {

    // CREATE CATEGORY
    async createCategory(categoryId, categoryData) {
        const response = await axios.post(
            `${CATEGORIES_URL}?documentId=${categoryId}`,
            toFirestoreFormat({
                id: categoryId,
                ...categoryData
            })
        );

        return fromFirestoreFormat(response.data);
    },

    // READ ONE CATEGORY
    async getCategory(categoryId) {
        const response = await axios.get(
            `${CATEGORIES_URL}/${categoryId}`
        );

        return fromFirestoreFormat(response.data);
    },

    // READ ALL CATEGORIES
    async getAllCategories() {
        const response = await axios.get(CATEGORIES_URL);

        const documents = response.data.documents || [];

        return documents.map(document =>
            fromFirestoreFormat(document)
        );
    },

    // UPDATE CATEGORY
    async updateCategory(categoryId, updatedData) {
        const params = new URLSearchParams();

        Object.keys(updatedData).forEach(key => {
            if (key !== "id") {
                params.append("updateMask.fieldPaths", key);
            }
        });

        const response = await axios.patch(
            `${CATEGORIES_URL}/${categoryId}?${params.toString()}`,
            toFirestoreFormat(updatedData)
        );

        return fromFirestoreFormat(response.data);
    },

    // DELETE CATEGORY
    async deleteCategory(categoryId) {
        await axios.delete(
            `${CATEGORIES_URL}/${categoryId}`
        );

        return {
            success: true,
            message: "Category deleted successfully"
        };
    }
};

window.CategoriesAPI = CategoriesAPI;
