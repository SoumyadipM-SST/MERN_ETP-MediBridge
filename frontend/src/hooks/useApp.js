import { createContext, useContext } from "react";

const AppContext = createContext(null);
const useApp = () => useContext(AppContext);
export { AppContext, useApp };
