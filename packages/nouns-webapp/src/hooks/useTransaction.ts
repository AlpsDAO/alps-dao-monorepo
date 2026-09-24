import { TransactionResponse, TransactionReceipt } from '@ethersproject/abstract-provider'
import { ChainId } from '../config'
import { useContext, useState } from 'react'
import { errors } from 'ethers'
import { WalletContext } from '../contexts/WalletContext'
import { usePublicProvider } from './usePublicProvider'
import { SafeTxProgress, waitForSafeExecution } from '../utils/safe'

// QueuedInSafe: proposed to the connected Safe, waiting for owner confirmations and execution
export type TransactionState = 'None' | 'PendingSignature' | 'QueuedInSafe' | 'Mining' | 'Success' | 'Fail' | 'Exception'

export interface TransactionStatus {
  status: TransactionState
  transaction?: TransactionResponse
  receipt?: TransactionReceipt
  chainId?: ChainId
  errorMessage?: string
  safeTx?: SafeTxProgress
}

const isDroppedAndReplaced = (e: any) =>
  e?.code === errors.TRANSACTION_REPLACED && e?.replacement && (e?.reason === 'repriced' || e?.cancelled === false)

export const useTransaction = (): { transact: (request: Promise<TransactionResponse>) => void, status: TransactionStatus, reset: () => void } => {
  const { isSafe } = useContext(WalletContext);
  const publicProvider = usePublicProvider();
  const [status, setStatus] = useState<TransactionStatus>({
    status: 'None'
  });

  const reset = () => {
    setStatus({ status: 'None' });
  }

  const transact = async (request: Promise<TransactionResponse>) =>  {
    setStatus(s => ({ ...s, status: 'PendingSignature' }));
    let transaction: TransactionResponse | undefined = undefined;
    try {
      transaction = await request;
      if (isSafe) {
        // The hash is the Safe's own transaction id; follow it through the Safe queue to execution
        const txHash = await waitForSafeExecution(transaction.hash, publicProvider, safeTx =>
          setStatus(s => ({ ...s, status: 'QueuedInSafe', transaction, safeTx })));
        if (!txHash) return;
        setStatus(s => ({ ...s, status: 'Mining', transaction }));
        const receipt = await publicProvider.waitForTransaction(txHash);
        setStatus(s => ({ ...s, status: receipt.status === 0 ? 'Fail' : 'Success', receipt }));
        return;
      }
      setStatus(s => ({ ...s, status: 'Mining', transaction, chainId: transaction?.chainId }));
      const receipt = await transaction.wait();
      setStatus(s => ({ ...s, status: 'Success', receipt }));
    }
    catch (e: any) {
      const errorMessage = e.error?.message ?? e.reason ?? e.data?.message ?? e.message
      if (transaction) {
        const droppedAndReplaced = isDroppedAndReplaced(e);

        if (droppedAndReplaced) {
          setStatus(s => ({
            ...s,
            status: e.receipt.status === 0 ? 'Fail' : 'Success',
            transaction: e.replacement,
            originalTransaction: transaction,
            receipt: e.receipt,
            errorMessage
          }));
        } else {
          setStatus(s => ({ ...s, status: 'Fail', receipt: e.receipt, errorMessage }));
        }
      } else {
        setStatus(s => ({ ...s, status: 'Exception', errorMessage }));
      }
    }
  }

  return { transact, status, reset };
};
