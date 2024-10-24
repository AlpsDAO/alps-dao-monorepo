import { useEffect, useState } from 'react';
import { getPublicProvider } from '../config';

export const useEnsAvatarLookup = (address: string) => {
  const [ensAvatar, setEnsAvatar] = useState<string>();

  useEffect(() => {
    const publicProvider = getPublicProvider();
    let mounted = true;
    if (address && publicProvider) {
      publicProvider
        .lookupAddress(address)
        .then(name => {
          if (!name) return;
          publicProvider.getResolver(name).then(resolver => {
            if (!resolver) return;
            resolver
              .getText('avatar')
              .then(avatar => {
                if (mounted) {
                  setEnsAvatar(avatar);
                }
              })
              .catch(error => {
                console.log(`error resolving ens avatar: `, error);
              });
          });
        })
        .catch(error => {
          console.log(`error resolving reverse ens lookup: `, error);
        });
    }

    return () => {
      setEnsAvatar('');
      mounted = false;
    };
  }, [address]);

  return ensAvatar;
};
