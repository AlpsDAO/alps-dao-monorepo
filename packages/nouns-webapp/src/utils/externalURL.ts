export enum ExternalURL {
  discord,
  twitter,
  notion,
  discourse,
  alpsCenter,
}

export const externalURL = (externalURL: ExternalURL) => {
  switch (externalURL) {
    case ExternalURL.discord:
      return 'https://discord.gg/V2uNwrwXga';
    case ExternalURL.twitter:
      return 'https://twitter.com/AlpsDAO';
    case ExternalURL.notion:
      return 'https://alps.notion.site/Explore-Alps-a2a9dceeb1d54e10b9cbf3f931c2266f';
    case ExternalURL.discourse:
      return 'https://discourse.alps.wtf/';
    case ExternalURL.alpsCenter:
      return 'https://alps.center/';
  }
};
