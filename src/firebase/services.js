// Firebase Service Layer - handles all Firestore operations
import {
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./config";

// Collections
const COLLECTIONS = {
  USERS: "users",
  ORDER_DATA: "orderData",
  USER_SETTINGS: "userSettings",
};

// User Operations
export const userService = {
  // Get user profile
  async getUser(uid) {
    const docRef = doc(db, COLLECTIONS.USERS, uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },

  // Create or update user profile
  async setUser(uid, userData) {
    const docRef = doc(db, COLLECTIONS.USERS, uid);
    await setDoc(
      docRef,
      {
        ...userData,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  },

  // Update user profile
  async updateUser(uid, updates) {
    const docRef = doc(db, COLLECTIONS.USERS, uid);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  // Delete user profile completely
  async deleteUser(uid) {
    const docRef = doc(db, COLLECTIONS.USERS, uid);
    await deleteDoc(docRef);
  },
};

// Order Data Operations
export const orderDataService = {
  // Get user's order data
  async getUserOrderData(uid) {
    const docRef = doc(db, COLLECTIONS.ORDER_DATA, uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  },

  // Save user's order data
  async saveOrderData(uid, orderData) {
    const docRef = doc(db, COLLECTIONS.ORDER_DATA, uid);
    await setDoc(docRef, {
      orderData,
      updatedAt: serverTimestamp(),
    });
  },

  // Delete user's order data
  async deleteOrderData(uid) {
    const docRef = doc(db, COLLECTIONS.ORDER_DATA, uid);
    await deleteDoc(docRef);
  },

  // Listen to real-time updates (optional)
  subscribeToOrderData(uid, callback) {
    const docRef = doc(db, COLLECTIONS.ORDER_DATA, uid);
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data());
      } else {
        callback(null);
      }
    });
  },
};

// User Settings Operations
export const settingsService = {
  // Get user settings
  async getUserSettings(uid) {
    const docRef = doc(db, COLLECTIONS.USER_SETTINGS, uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : {};
  },

  // Save user settings
  async saveUserSettings(uid, settings) {
    const docRef = doc(db, COLLECTIONS.USER_SETTINGS, uid);
    await setDoc(
      docRef,
      {
        ...settings,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  },

  // Update specific setting
  async updateSetting(uid, settingKey, settingValue) {
    const docRef = doc(db, COLLECTIONS.USER_SETTINGS, uid);
    await updateDoc(docRef, {
      [settingKey]: settingValue,
      updatedAt: serverTimestamp(),
    });
  },

  // Listen to real-time settings updates
  subscribeToSettings(uid, callback) {
    const docRef = doc(db, COLLECTIONS.USER_SETTINGS, uid);
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data());
      } else {
        callback({});
      }
    });
  },

  // Delete all user settings
  async deleteUserSettings(uid) {
    const docRef = doc(db, COLLECTIONS.USER_SETTINGS, uid);
    await deleteDoc(docRef);
  },
};

// Migration helper - move localStorage data to Firebase
export const migrationService = {
  async migrateLocalStorageData(uid) {
    try {
      // Check if user already has Firebase data
      const existingOrderData = await orderDataService.getUserOrderData(uid);
      const existingSettings = await settingsService.getUserSettings(uid);

      // Only migrate if no existing data in Firebase
      if (!existingOrderData) {
        const localOrderData = localStorage.getItem("shopifyOrderData");
        if (localOrderData) {
          await orderDataService.saveOrderData(uid, JSON.parse(localOrderData));
          console.log("Migrated order data to Firebase");
        }
      }

      if (Object.keys(existingSettings).length === 0) {
        const localSettings = {};

        // Migrate various settings
        const costSettings = localStorage.getItem("costSettings");
        if (costSettings) localSettings.costSettings = JSON.parse(costSettings);

        const darkMode = localStorage.getItem("darkMode");
        if (darkMode) localSettings.darkMode = JSON.parse(darkMode);

        const sizeCostingEnabled = localStorage.getItem("sizeCostingEnabled");
        if (sizeCostingEnabled)
          localSettings.sizeCostingEnabled = JSON.parse(sizeCostingEnabled);

        const sizeOverrides = localStorage.getItem("sizeOverrides");
        if (sizeOverrides)
          localSettings.sizeOverrides = JSON.parse(sizeOverrides);

        if (Object.keys(localSettings).length > 0) {
          await settingsService.saveUserSettings(uid, localSettings);
          console.log("Migrated settings to Firebase");
        }
      }

      return true;
    } catch (error) {
      console.error("Migration failed:", error);
      return false;
    }
  },

  // Optional: Clear localStorage after successful migration
  clearLocalStorage() {
    const keysToRemove = [
      "shopifyOrderData",
      "costSettings",
      "darkMode",
      "sizeCostingEnabled",
      "sizeOverrides",
      "shopifyOrdersUsers",
      "shopifyOrdersUser",
    ];

    keysToRemove.forEach((key) => localStorage.removeItem(key));
    console.log("Cleared localStorage after migration");
  },
};

// Complete User Deletion Service - removes all user data from Firebase
export const userDeletionService = {
  async deleteAllUserData(uid) {
    try {
      console.log(`Deleting all data for user: ${uid}`);

      // Delete user profile
      await userService.deleteUser(uid);
      console.log("Deleted user profile");

      // Delete order data
      await orderDataService.deleteOrderData(uid);
      console.log("Deleted order data");

      // Delete settings
      await settingsService.deleteUserSettings(uid);
      console.log("Deleted user settings");

      console.log("Successfully deleted all user data from Firebase");
      return true;
    } catch (error) {
      console.error("Error deleting user data from Firebase:", error);
      throw error;
    }
  },
};
