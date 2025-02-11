const DB_NAME = "LargeJSONDB";
const USERS_STORE = "users";

/**
 * Opens IndexedDB and initializes the "users" store.
 * @returns {Promise<IDBDatabase>}
 */
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(USERS_STORE)) {
                db.createObjectStore(USERS_STORE, { keyPath: "id" }); // Primary key: id
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("IndexedDB failed to open");
    });
}

/**
 * Adds multiple users in bulk using a single transaction.
 * @param {Object[]} users - Array of user objects.
 * @returns {Promise<void>}
 */
async function addUsersBulk(users) {
    const db = await openDatabase();
    const transaction = db.transaction(USERS_STORE, "readwrite");
    const store = transaction.objectStore(USERS_STORE);

    users.forEach(user => store.put(user)); // Bulk insert

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject("Failed to add users in bulk");
    });
}

/**
 * Adds a user to IndexedDB.
 * @param {Object} user - User object with an `id` and other fields.
 * @returns {Promise<void>}
 */
async function addUser(user) {
    const db = await openDatabase();
    const transaction = db.transaction(USERS_STORE, "readwrite");
    const store = transaction.objectStore(USERS_STORE);

    store.put(user); // If `id` exists, it updates; otherwise, it inserts

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject("Failed to add user");
    });
}

/**
 * Retrieves a user by ID from IndexedDB.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<Object|null>}
 */
async function getUser(userId) {
    const db = await openDatabase();
    const transaction = db.transaction(USERS_STORE, "readonly");
    const store = transaction.objectStore(USERS_STORE);

    return new Promise((resolve, reject) => {
        const request = store.get(userId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject("Failed to retrieve user");
    });
}

/**
 * Retrieves all users from IndexedDB.
 * @returns {Promise<Object[]>}
 */
async function getAllUsers() {
    const db = await openDatabase();
    const transaction = db.transaction(USERS_STORE, "readonly");
    const store = transaction.objectStore(USERS_STORE);
    const users = [];

    return new Promise((resolve, reject) => {
        const request = store.openCursor();
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                users.push(cursor.value);
                cursor.continue();
            } else {
                resolve(users);
            }
        };
        request.onerror = () => reject("Failed to retrieve all users");
    });
}

/**
 * Deletes a user by ID from IndexedDB.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<void>}
 */
async function deleteUser(userId) {
    const db = await openDatabase();
    const transaction = db.transaction(USERS_STORE, "readwrite");
    const store = transaction.objectStore(USERS_STORE);

    store.delete(userId);

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject("Failed to delete user");
    });
}

/**
 * Generates 100,000 users and adds them to IndexedDB in chunks.
 * @param {number} batchSize - Number of users per batch.
 */
async function addLargeNumberOfUsers(batchSize = 5000) {
    console.log("Generating and inserting users...");
    
    const totalUsers = 100000;
    for (let i = 0; i < totalUsers; i += batchSize) {
        const usersBatch = Array.from({ length: batchSize }, (_, index) => ({
            id: i + index,
            name: `User_${i + index}`,
            age: Math.floor(Math.random() * 60) + 18, // Random age 18-77
            email: `user${i + index}@example.com`
        }));

        await addUsersBulk(usersBatch); // Insert batch into IndexedDB
        console.log(`Inserted ${i + batchSize}/${totalUsers} users`);
    }

    console.log("✅ Finished inserting 100,000 users!");
}

/**
 * Retrieves users from IndexedDB with sorting and pagination.
 * @param {string} order - Sorting order: 'asc' (small to large) or 'desc' (large to small).
 * @param {number} count - Number of users to retrieve.
 * @param {number} skip - Number of users to skip (for pagination).
 * @returns {Promise<Object[]>}
 */
async function getUsers(order = "desc", count = 10, skip = 0) {
    const db = await openDatabase();
    const transaction = db.transaction(USERS_STORE, "readonly");
    const store = transaction.objectStore(USERS_STORE);
    const users = [];
    let skipped = 0;

    return new Promise((resolve, reject) => {
        const direction = order === "asc" ? "next" : "prev"; // "next" = ascending, "prev" = descending
        const request = store.openCursor(null, direction);

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                if (skipped < skip) {
                    skipped++; // Skip users
                    cursor.continue();
                } else if (users.length < count) {
                    users.push(cursor.value); // Collect required users
                    cursor.continue();
                } else {
                    resolve(users); // Stop when count is reached
                }
            } else {
                resolve(users); // Return collected users if cursor is exhausted
            }
        };

        request.onerror = () => reject("Failed to retrieve users");
    });
}

/**
 * Clears all users from IndexedDB.
 * @returns {Promise<void>}
 */
async function clearUsers() {
    const db = await openDatabase();
    const transaction = db.transaction(USERS_STORE, "readwrite");
    const store = transaction.objectStore(USERS_STORE);

    store.clear();

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject("Failed to clear users");
    });
}


// Run the bulk user insertion
//addLargeNumberOfUsers();

// Add some users
await addUser({ id: 1111111, name: "Alice", age: 25 });
await addUser({ id: 1111112, name: "Bob", age: 30 });
await addUser({ id: 1111113, name: "Charlie", age: 22 });

// Retrieve a single user
const user = await getUser(1111112);
console.log("Retrieved user:", user);

// Retrieve all users
// const allUsers = await getAllUsers();
// console.log("All users:", allUsers);

// Delete a user
await deleteUser(1111111);
console.log("User 1111111 deleted");

// Clear all users
// await clearUsers();

// Example Usage
getUsers("desc", 10, 0)  // Get first 10 users in descending order
    .then(users => console.log("Users:", users))
    .catch(console.error);
    
// Pagination Example
getUsers("desc", 10, 10) // Get next 10 users (after first 10)
    .then(users => console.log("Next 10 Users:", users))
    .catch(console.error);
    
getUsers("asc", 10, 0)  // Get first 10 users in ascending order
    .then(users => console.log("Users (ascending):", users))
    .catch(console.error);

