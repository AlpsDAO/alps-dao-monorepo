import { useEffect, useState } from 'react';
import { usePublicProvider } from '../hooks/usePublicProvider';

export const useEnsAvatarLookup = (address: string) => {
  const publicProvider = usePublicProvider();
  const [ensAvatar, setEnsAvatar] = useState<string>();

  useEffect(() => {
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
