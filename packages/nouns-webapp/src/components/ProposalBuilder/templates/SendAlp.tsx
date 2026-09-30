import React, { useEffect, useState } from 'react';
import { FormControl, InputGroup } from 'react-bootstrap';
import { BigNumber, Contract } from 'ethers';
import { Trans } from '@lingui/macro';
import { PhotographIcon } from '@heroicons/react/outline';
import clsx from 'clsx';
import config from '../../../config';
import { AddressValue, emptyAddress } from '../../../utils/proposalActions/abiInputs';
import { functionAction } from '../../../utils/proposalActions/encoding';
import { getReadProvider, sameAddress, TREASURY_ADDRESS } from '../../../utils/proposalActions/contracts';
import AddressInput from '../inputs/AddressInput';
import Field, { Tick } from '../inputs/Field';
import { AddressLabel } from '../../ProposalActionSummary';
import { ActionValidation } from '../types';
import { ActionTemplate, namesFor } from './types';
import { recipientError, recipientWarning } from './SendEth';
import classes from '../ProposalBuilder.module.css';

export interface SendAlpForm {
  alpId: string;
  recipient: AddressValue;
}

const TOKEN_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
];
const MAX_LISTED = 40;

const alpToken = () => new Contract(config.addresses.alpsToken, TOKEN_ABI, getReadProvider());

const parseAlpId = (text: string) => (/^\d+$/.test(text.trim()) ? text.trim() : undefined);

/** Alps the treasury holds now (the first few, if it holds a lot). */
const useTreasuryAlps = () => {
  const [ids, setIds] = useState<string[]>();
  useEffect(() => {
    let active = true;
    (async () => {
      const token = alpToken();
      const count: BigNumber = await token.balanceOf(TREASURY_ADDRESS);
      const listed = Math.min(count.toNumber(), MAX_LISTED);
      const found = await Promise.all(
        Array.from({ length: listed }, (_, i) => token.tokenOfOwnerByIndex(TREASURY_ADDRESS, i)),
      );
      if (active) setIds(found.map((id: BigNumber) => id.toString()).sort((a, b) => Number(a) - Number(b)));
    })().catch(() => active && setIds([]));
    return () => {
      active = false;
    };
  }, []);
  return ids;
};

type Ownership = { id: string; owner?: string; missing?: boolean };

const useAlpOwner = (id: string | undefined) => {
  const [ownership, setOwnership] = useState<Ownership>();
  useEffect(() => {
    if (!id) return;
    let active = true;
    const timer = setTimeout(() => {
      alpToken()
        .ownerOf(id)
        .then((owner: string) => active && setOwnership({ id, owner }))
        .catch(() => active && setOwnership({ id, missing: true }));
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id]);
  return ownership?.id === id ? ownership : undefined;
};

const validate = (form: SendAlpForm): ActionValidation => {
  const errors: ActionValidation['errors'] = {};
  const warnings: React.ReactNode[] = [];
  const alpId = parseAlpId(form.alpId);
  if (form.alpId.trim() && !alpId) errors.alpId = <Trans>Enter the Alp's number, like 123</Trans>;

  const toError = recipientError(form.recipient);
  if (toError) errors.recipient = toError;
  const toWarning = recipientWarning(form.recipient);
  if (toWarning) warnings.push(toWarning);

  const tx =
    alpId && form.recipient.address && !errors.recipient
      ? functionAction(config.addresses.alpsToken, 'transferFrom(address,address,uint256)', [
          TREASURY_ADDRESS,
          form.recipient.address,
          alpId,
        ])
      : undefined;
  return { tx, errors, warnings, names: namesFor(form.recipient) };
};

const SendAlpFormView: ActionTemplate<SendAlpForm>['Form'] = ({ form, onChange, validation }) => {
  const treasuryAlps = useTreasuryAlps();
  const alpId = parseAlpId(form.alpId);
  const ownership = useAlpOwner(alpId);

  let ownerNote: React.ReactNode = null;
  if (alpId && ownership?.missing) {
    ownerNote = (
      <div className={classes.error}>
        <Trans>Alp {alpId} doesn't exist yet.</Trans>
      </div>
    );
  } else if (alpId && ownership?.owner && sameAddress(ownership.owner, TREASURY_ADDRESS)) {
    ownerNote = (
      <div className={classes.ok}>
        <Tick /> <Trans>The treasury holds Alp {alpId}</Trans>
      </div>
    );
  } else if (alpId && ownership?.owner) {
    ownerNote = (
      <div className={classes.error}>
        <Trans>
          Alp {alpId} belongs to <AddressLabel address={ownership.owner} />, not the treasury, so
          this would fail unless the treasury holds it by the time the proposal executes.
        </Trans>
      </div>
    );
  }

  return (
    <>
      <Field
        label={<Trans>Alp</Trans>}
        htmlFor="send-alp-id"
        error={validation.errors.alpId}
        hint={
          treasuryAlps === undefined ? (
            <Trans>Checking which Alps the treasury holds…</Trans>
          ) : treasuryAlps.length === 0 ? (
            <Trans>The treasury doesn't hold any Alps right now.</Trans>
          ) : undefined
        }
      >
        {!!treasuryAlps?.length && (
          <div className={clsx(classes.chips)} style={{ marginBottom: '0.5rem' }}>
            {treasuryAlps.map(id => (
              <button
                key={id}
                type="button"
                className={clsx(classes.chip, alpId === id && classes.selected)}
                onClick={() => onChange({ ...form, alpId: id })}
              >
                {id}
              </button>
            ))}
          </div>
        )}
        <InputGroup className={classes.inputGroup}>
          <InputGroup.Text className={classes.unit} style={{ borderRadius: '10px 0 0 10px' }}>
            #
          </InputGroup.Text>
          <FormControl
            id="send-alp-id"
            className={classes.input}
            style={{ borderRadius: '0 10px 10px 0' }}
            value={form.alpId}
            inputMode="numeric"
            placeholder="123"
            autoComplete="off"
            onChange={e => onChange({ ...form, alpId: e.target.value })}
          />
        </InputGroup>
        {ownerNote}
      </Field>
      <Field label={<Trans>Recipient</Trans>} htmlFor="send-alp-to" error={validation.errors.recipient}>
        <AddressInput
          id="send-alp-to"
          value={form.recipient}
          onChange={recipient => onChange({ ...form, recipient })}
        />
      </Field>
    </>
  );
};

const sendAlp: ActionTemplate<SendAlpForm> = {
  kind: 'send-alp',
  title: <Trans>Send an Alp</Trans>,
  description: <Trans>Transfer an Alp the treasury holds</Trans>,
  icon: PhotographIcon,
  initialForm: () => ({ alpId: '', recipient: emptyAddress() }),
  validate,
  Form: SendAlpFormView,
};

export default sendAlp;
