// User Authentication Provider Component
import { useState, useEffect } from "react";
import { AuthContext } from "./AuthContext";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Create demo user if no users exist
    const users = JSON.parse(
      localStorage.getItem("shopifyOrdersUsers") || "[]"
    );
    if (users.length === 0) {
      const demoUser = {
        id: 1,
        email: "demo@demo.com",
        password: "demo123",
        name: "Demo User",
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem("shopifyOrdersUsers", JSON.stringify([demoUser]));
    }

    // Check if user is logged in on app start
    const savedUser = localStorage.getItem("shopifyOrdersUser");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (email, password) => {
    // Get saved users from localStorage
    const users = JSON.parse(
      localStorage.getItem("shopifyOrdersUsers") || "[]"
    );
    const user = users.find(
      (u) => u.email === email && u.password === password
    );

    if (user) {
      setUser(user);
      localStorage.setItem("shopifyOrdersUser", JSON.stringify(user));
      return { success: true };
    }

    return { success: false, error: "Invalid email or password" };
  };

  const register = (email, password, name) => {
    // Get existing users
    const users = JSON.parse(
      localStorage.getItem("shopifyOrdersUsers") || "[]"
    );

    // Check if user already exists
    if (users.find((u) => u.email === email)) {
      return { success: false, error: "User already exists" };
    }

    // Create new user
    const newUser = {
      id: Date.now(),
      email,
      password,
      name,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem("shopifyOrdersUsers", JSON.stringify(users));

    setUser(newUser);
    localStorage.setItem("shopifyOrdersUser", JSON.stringify(newUser));

    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("shopifyOrdersUser");
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
