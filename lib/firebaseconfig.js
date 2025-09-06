import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Replace with your Firebase config
const firebaseConfig = {
  databaseURL: "https://naaapp-e189c-default-rtdb.firebaseio.com/",
  projectId: "naaapp-e189c",  
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);


export default firebaseConfig;