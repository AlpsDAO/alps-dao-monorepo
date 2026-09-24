import { Trans } from '@lingui/macro';
import { SafeTxProgress } from '../../utils/safe';

/**
 * Explains that a transaction is waiting in the connected Safe's queue, with its confirmation progress.
 * Renders inline so it can sit inside the alert modal's paragraph.
 */
const SafeTxNotice: React.FC<{ safeTx: SafeTxProgress }> = ({ safeTx }) => {
  const { confirmationsSubmitted, confirmationsRequired, url } = safeTx;
  return (
    <>
      {confirmationsSubmitted < confirmationsRequired ? (
        <Trans>
          Sent to your Safe. It will execute once {confirmationsRequired} owners have confirmed it (
          {confirmationsSubmitted} so far) and one of them executes it.
        </Trans>
      ) : (
        <Trans>
          Sent to your Safe with all {confirmationsRequired} confirmations. Waiting for an owner to
          execute it.
        </Trans>
      )}
      <br />
      <a href={url} target="_blank" rel="noreferrer">
        <Trans>View in Safe</Trans>
      </a>
    </>
  );
};

export default SafeTxNotice;
