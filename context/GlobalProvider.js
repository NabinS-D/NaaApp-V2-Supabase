import { useContext, createContext, useState, useEffect } from "react";
import { getCurrentUser } from "../lib/APIs/UserApiSupabase";
import { router } from "expo-router";

const GlobalContext = createContext();

export const useGlobalContext = () => useContext(GlobalContext);

const GlobalProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [userdetails, setuserdetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async (initialLoad = true) => {
    if (initialLoad) {
      setIsLoading(true);
    }

    try {
      const currentUser = await getCurrentUser();
      if (currentUser?.id) {
        setUser(currentUser);
        setuserdetails(currentUser);
        setIsLoggedIn(true);

        // Only redirect on initial load, not on refresh
        if (initialLoad && !router.pathname?.startsWith('/(tabs)')) {
          router.replace('/(tabs)');
        }
        return true;
      }
      throw new Error('No valid user session');
    } catch (error) {
      setUser(null);
      setuserdetails(null);
      setIsLoggedIn(false);

      // If we're not on an auth screen or index, redirect to index
      if (!router.pathname?.startsWith('/(auth)') && router.pathname !== '/') {
        router.replace('/');
      }
      return false;
    } finally {
      if (initialLoad) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    checkAuth().catch((error) => {
      setIsLoading(false);
    });
  }, []);

  return (
    <GlobalContext.Provider
      value={{
        isLoading,
        user,
        setUser,
        isLoggedIn,
        setIsLoggedIn,
        checkAuth,
        userdetails,
        setuserdetails,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalProvider;