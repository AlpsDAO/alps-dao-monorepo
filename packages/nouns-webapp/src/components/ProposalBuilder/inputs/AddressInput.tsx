import React, { useEffect, useRef, useState } from 'react';
import { FormControl } from 'react-bootstrap';
import { utils } from 'ethers';
import { Trans } from '@lingui/macro';
import clsx from 'clsx';
import { AddressValue } from '../../../utils/proposalActions/abiInputs';
import { getReadProvider, knownContract } from '../../../utils/proposalActions/contracts';
import { useReverseENSLookUp } from '../../../utils/ensLookup';
import { KnownContractName } from '../../ProposalActionSummary';
import { Tick } from './Field';
import classes from '../ProposalBuilder.module.css';

const looksLikeEns = (text: string) => /^[^\s/]+\.[a-z0-9-]{2,}$/i.test(text) && !/^0x/i.test(text);

/** The value for newly typed text: resolved on the spot when it's already an address. */
export const addressValueFor = (text: string): AddressValue => {
  const trimmed = text.trim();
  return utils.isAddress(trimmed) ? { text, address: utils.getAddress(trimmed) } : { text };
};

const AddressConfirmation: React.FC<{ address: string }> = ({ address }) => {
  const ens = useReverseENSLookUp(address);
  if (knownContract(address)) {
    return (
      <div className={classes.ok}>
        <Tick /> <KnownContractName address={address} />
      </div>
    );
  }
  if (ens) {
    return (
      <div className={classes.ok}>
        <Tick /> {ens}
      </div>
    );
  }
  return null;
};

/** An Ethereum address or ENS name, resolved as you type. */
const AddressInput: React.FC<{
  id?: string;
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  placeholder?: string;
}> = ({ id, value, onChange, placeholder }) => {
  const [lookup, setLookup] = useState<{ name: string; status: 'resolving' | 'not-found' }>();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const text = value.text.trim();
  const needsLookup = looksLikeEns(text) && !(value.address && value.ensName === text);

  useEffect(() => {
    if (!needsLookup) {
      setLookup(undefined);
      return;
    }
    let active = true;
    setLookup({ name: text, status: 'resolving' });
    const timer = setTimeout(async () => {
      const resolved = await getReadProvider()
        .resolveName(text)
        .catch(() => null);
      if (!active) return;
      if (resolved) {
        setLookup(undefined);
        onChangeRef.current({ text: value.text, address: utils.getAddress(resolved), ensName: text });
      } else {
        setLookup({ name: text, status: 'not-found' });
      }
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // value.text only matters through `text`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, needsLookup]);

  let status: React.ReactNode = null;
  if (lookup?.status === 'resolving') {
    status = (
      <div className={classes.pending}>
        <Trans>Looking up {lookup.name}…</Trans>
      </div>
    );
  } else if (lookup?.status === 'not-found') {
    status = (
      <div className={classes.error}>
        <Trans>No address is set for {lookup.name}</Trans>
      </div>
    );
  } else if (value.address && value.ensName) {
    const address = value.address;
    status = (
      <div className={classes.ok}>
        <Tick /> {address}
      </div>
    );
  } else if (value.address) {
    status = <AddressConfirmation address={value.address} />;
  } else if (text && /^0x[0-9a-f]{40}$/i.test(text)) {
    status = (
      <div className={classes.error}>
        <Trans>
          This address's capitalization doesn't match its checksum, so it may have a typo. Paste it
          again, or type it all in lowercase.
        </Trans>
      </div>
    );
  } else if (text && !looksLikeEns(text)) {
    status = (
      <div className={classes.error}>
        <Trans>Enter an address starting with 0x, or an ENS name like alps.eth</Trans>
      </div>
    );
  }

  return (
    <>
      <FormControl
        id={id}
        className={clsx(classes.input, classes.mono)}
        value={value.text}
        placeholder={placeholder ?? '0x… or name.eth'}
        spellCheck={false}
        autoComplete="off"
        onChange={e => onChange(addressValueFor(e.target.value))}
      />
      {status}
    </>
  );
};

export default AddressInput;
