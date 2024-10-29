import { createContext } from "react";
import { Wallet } from "../hooks/useWallet";

export const WalletContext = createContext<Wallet>({});
