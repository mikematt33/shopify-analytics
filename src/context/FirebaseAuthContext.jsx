// Firebase Authentication Provider Component
import { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
} from "firebase/auth";
import { auth } from "../firebase/config";
import {
  userService,
  migrationService,
  userDeletionService,
} from "../firebase/services";
import { AuthContext } from "./AuthContext";

export const FirebaseAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      if (firebaseUser) {
        try {
          // Get or create user profile
          let userProfile = await userService.getUser(firebaseUser.uid);

          if (!userProfile) {
            // Create user profile if it doesn't exist
            const profileData = {
              email: firebaseUser.email,
              name: firebaseUser.displayName || "User",
              createdAt: new Date().toISOString(),
            };
            await userService.setUser(firebaseUser.uid, profileData);
            userProfile = { id: firebaseUser.uid, ...profileData };
          }

          // Try to migrate localStorage data if this is a new Firebase user
          // Do this in the background to avoid blocking UI
          migrationService
            .migrateLocalStorageData(firebaseUser.uid)
            .catch(console.error);

          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: userProfile.name,
            ...userProfile,
          });
          setError(null);
        } catch (error) {
          console.error("Error setting up user:", error);
          setError("Failed to load user profile");
          // Still set basic user info even if profile loading fails
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || "User",
          });
        }
      } else {
        setUser(null);
        setError(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);

      // Handle demo user - create if doesn't exist
      if (email === "demo@demo.com" && password === "demo123") {
        try {
          await signInWithEmailAndPassword(auth, email, password);
          return { success: true };
        } catch (signInError) {
          if (
            signInError.code === "auth/user-not-found" ||
            signInError.code === "auth/invalid-credential"
          ) {
            // Create demo user
            const userCredential = await createUserWithEmailAndPassword(
              auth,
              email,
              password
            );
            await updateProfile(userCredential.user, {
              displayName: "Demo User",
            });
            return { success: true };
          }
          throw signInError;
        }
      }

      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "Login failed";

      switch (error.code) {
        case "auth/user-not-found":
        case "auth/invalid-credential":
          errorMessage = "Invalid email or password";
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email address";
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many failed attempts. Please try again later";
          break;
        default:
          errorMessage = error.message;
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const register = async (email, password, name) => {
    try {
      setError(null);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await updateProfile(userCredential.user, { displayName: name });

      // The onAuthStateChanged listener will handle setting up the user profile
      return { success: true };
    } catch (error) {
      console.error("Registration error:", error);
      let errorMessage = "Registration failed";

      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "An account with this email already exists";
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email address";
          break;
        case "auth/weak-password":
          errorMessage = "Password should be at least 6 characters";
          break;
        default:
          errorMessage = error.message;
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      setError("Failed to logout");
      return { success: false, error: error.message };
    }
  };

  const deleteAccount = async () => {
    try {
      if (!user?.id) {
        return { success: false, error: "No user logged in" };
      }

      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, error: "No authenticated user found" };
      }

      console.log("Starting account deletion process...");

      // Delete ALL user data from Firestore first
      try {
        await userDeletionService.deleteAllUserData(user.id);
        console.log("Successfully deleted all user data from Firebase");
      } catch (firestoreError) {
        console.error(
          "Error deleting user data from Firebase:",
          firestoreError
        );
        // Continue with account deletion even if data deletion fails
        // But log the error so user knows there might be residual data
      }

      // Delete the Firebase Auth user account
      await deleteUser(currentUser);
      console.log("Successfully deleted Firebase Auth account");

      // Clear local state
      setUser(null);
      setError(null);

      return { success: true };
    } catch (error) {
      console.error("Account deletion error:", error);
      let errorMessage = "Failed to delete account";

      switch (error.code) {
        case "auth/requires-recent-login":
          errorMessage =
            "For security, please log out and log back in, then try deleting your account again";
          break;
        case "auth/user-not-found":
          errorMessage = "User account not found";
          break;
        default:
          errorMessage = error.message;
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    deleteAccount,
    loading,
    error,
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
