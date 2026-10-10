import { getReadProvider } from "../utils/proposalActions/contracts";

// One provider for the whole app: it knows its network, so it doesn't ask the node for it before each call
export const usePublicProvider = () => getReadProvider();
