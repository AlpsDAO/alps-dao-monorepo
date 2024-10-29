import { ethers } from "ethers";
import { useMemo } from "react";
import config from "../config";

export const usePublicProvider = () => {
    return useMemo(() => ethers.getDefaultProvider(config.app.jsonRpcUri), []);
};
