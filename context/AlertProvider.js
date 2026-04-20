import React, { createContext, useContext, useState } from "react";
import FancyAlert from "../components/CustomAlert";

const AlertContext = createContext();
const useAlertContext = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const [alert, setAlert] = useState({
    isVisible: false,
    title: "",
    message: "",
    variant: "success",
  });

  const showAlert = (title, message, variant = "success") => {
    setAlert({
      isVisible: true,
      title,
      message,
      variant,
    });
  };

  const hideAlert = () => {
    setAlert({ isVisible: false, title: "", message: "", variant: "success" });
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <FancyAlert
        isVisible={alert.isVisible}
        title={alert.title}
        message={alert.message}
        variant={alert.variant}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
};

export default useAlertContext;
