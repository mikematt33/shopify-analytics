// Custom hook for managing user settings with Firebase
import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { settingsService } from "../firebase/services";

export const useSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    costSettings: {},
    sizeCostingEnabled: false,
    sizeOverrides: {},
    darkMode: true,
  });
  const [loading, setLoading] = useState(true);

  // Load settings when user logs in
  useEffect(() => {
    const loadSettings = async () => {
      if (user?.id) {
        setLoading(true);
        try {
          const userSettings = await settingsService.getUserSettings(user.id);
          setSettings({
            costSettings: userSettings.costSettings || {},
            sizeCostingEnabled: userSettings.sizeCostingEnabled || false,
            sizeOverrides: userSettings.sizeOverrides || {},
            darkMode:
              userSettings.darkMode !== undefined
                ? userSettings.darkMode
                : true,
          });
        } catch (error) {
          console.error("Failed to load settings:", error);
          // Fallback to localStorage
          setSettings({
            costSettings: JSON.parse(
              localStorage.getItem("costSettings") || "{}"
            ),
            sizeCostingEnabled: JSON.parse(
              localStorage.getItem("sizeCostingEnabled") || "false"
            ),
            sizeOverrides: JSON.parse(
              localStorage.getItem("sizeOverrides") || "{}"
            ),
            darkMode: JSON.parse(localStorage.getItem("darkMode") || "true"),
          });
        } finally {
          setLoading(false);
        }
      } else {
        // Reset to defaults when not logged in
        setSettings({
          costSettings: {},
          sizeCostingEnabled: false,
          sizeOverrides: {},
          darkMode: true,
        });
        setLoading(false);
      }
    };

    loadSettings();
  }, [user?.id]);

  // Update a specific setting
  const updateSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    if (user?.id) {
      try {
        await settingsService.updateSetting(user.id, key, value);
      } catch (error) {
        console.error(`Failed to save ${key} setting:`, error);
        // Fallback to localStorage
        localStorage.setItem(key, JSON.stringify(value));
      }
    } else {
      // Save to localStorage if not logged in
      localStorage.setItem(key, JSON.stringify(value));
    }
  };

  // Update multiple settings at once
  const updateSettings = async (updates) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    if (user?.id) {
      try {
        await settingsService.saveUserSettings(user.id, updates);
      } catch (error) {
        console.error("Failed to save settings:", error);
        // Fallback to localStorage
        Object.entries(updates).forEach(([key, value]) => {
          localStorage.setItem(key, JSON.stringify(value));
        });
      }
    } else {
      // Save to localStorage if not logged in
      Object.entries(updates).forEach(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value));
      });
    }
  };

  return {
    settings,
    updateSetting,
    updateSettings,
    loading,
  };
};
