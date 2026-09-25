import config from '../../config';
import { buildEtherscanAddressLink } from '../../utils/etherscan';

// The About page, carried over from the old GitBook (about.alps.wtf) and updated. Each section is Markdown;
// links starting with "/" stay inside the app. Governance numbers match the deployed contracts.

export interface AboutSection {
  id: string;
  title: string;
  markdown: string;
}

const DISCORD = 'https://discord.gg/V2uNwrwXga';
const OPENSEA = 'https://opensea.io/collection/alpsdao';

const contract = (name: string, address: string, link: string) => `**${name}**  \n[${address}](${link})`;

export const aboutIntro =
  'An alpine club for people who love the mountains, with a treasury its members run together. Here’s how it works.';

export const aboutSections: AboutSection[] = [
  {
    id: 'what-is-alps',
    title: 'What is Alps?',
    markdown: `
Alps is an alpine club for skiers, snowboarders and mountain lovers of every kind, with a shared treasury that its members control.

**Membership is an Alp.** Each Alp is a membership in the club and one vote. Alps are [ERC-721](https://ethereum.org/en/developers/docs/standards/tokens/erc-721/) tokens (NFTs) whose 32×32 pixel artwork and metadata live entirely on the Ethereum blockchain. Each Alp is made from hand-drawn traits layered generatively, so every one is unique.

One Alp is auctioned [every 3 hours](/), and Alps can also be bought on secondary markets such as [OpenSea](${OPENSEA}).

100% of auction proceeds go to the club treasury, and members decide together how it’s spent: each Alp is one vote on proposals to fund films, events, athletes, member perks and anything else that serves the club.

Alps has Nounish roots. It grew out of the [Nouns](https://nouns.wtf) ⌐◨-◨ ecosystem and shares its auction and governance design, and its playful spirit.
`,
  },
  {
    id: 'vision-mission',
    title: 'Vision & mission',
    markdown: `
### Vision

To support and benefit alpine enthusiasts and communities through a self-sustaining, member-driven club with its own treasury.

It’s a new way to fund shared goals as a community, rather than the traditional business models of the past. Alps could fund films, events and athletes, help form a resort staff guild, even build staff accommodation if the community grows large enough and wants to.

### Mission

To fund proposals from the treasury that benefit alpine communities and members by enhancing on-mountain environments and experiences.

We aim to support local businesses in alpine areas and give members unique benefits connected to alpine communities around the world.

Alps’ first resort partnership was with Rusutsu Resort in Hokkaido, Japan, where members tested initiatives that could be scaled to other resorts.
`,
  },
  {
    id: 'objectives',
    title: 'Objectives',
    markdown: `
The club’s objectives are funded by its treasury. Members are encouraged to submit and vote on proposals that serve them.

### Build a community of alpine enthusiasts

Alpine activities are best done in groups. Alps’ channels are where members share ideas, destinations, gear, tips and tricks, and plan meetups and trips.

*Proposal ideas:* annual meetups at an alpine resort (northern or southern hemisphere, winter or summer); curated Discord channels for destination guides, a gear marketplace, local hangouts, trip planning, jobs, proposal ideas and events.

### Spread Nounish culture in the mountains

Alps carries the ⌐◨-◨ spirit into alpine communities, prioritising initiatives that bring long-term branding, visibility and education.

*Proposal ideas:* sponsored on-mountain events such as competitions and festivals; gondolas and chairlifts wrapped in Nounish art; sponsored ski schools; ski patrol and instructor apparel; naming or branding rights for ski maps, courses, runs and lifts; Nounish alpine merch such as goggles, snowboards, skis, helmets, apparel and in-room items.

### Improve alpine regions

Remote, rural alpine regions face real challenges for the people who live there and for the environment. Alps aims to support them where it can.

*Proposal ideas:* initiatives that improve agriculture, environment, energy, communication, education, transportation and safety.

### Create Nounish features and infrastructure

How can Nounishness spread physically, with a sense of place and permanence? We picture alpine communities embracing features and infrastructure that capture the club’s culture and vibe.

*Proposal ideas:* Nounish establishments (retail, food and drink, lodging); on-mountain rest stations and warming huts; terrain parks and features.

### Provide member benefits

As membership grows, Alps can use the size of the community to negotiate benefits for members.

*Proposal ideas:* discounted lodging, lift passes, retail, rentals, lessons, food, drink and experiences; first-tracks VIP lift access; Nounish merch; gamification, competitions and rewards.

### Organise events

Touching snow is what we’re all about, though we encourage year-round adventures on grass, rock, dirt, sand and water too. Members are encouraged to propose meetups and events.

*Proposal ideas:* seasonal on-mountain events; local competitions; alpine conferences; regular meetups and activities.
`,
  },
  {
    id: 'auctions',
    title: 'Auctions',
    markdown: `
### One Alp every 3 hours

One Alp is auctioned every 3 hours, 8 a day: one for each of the 8 largest alpine tundra biomes on Earth. They are the Himalayas, the Scottish Highlands, the Scandinavian Mountains, the American Cordillera, the Rift Mountains of Africa, the Carpathian and Pyrenees Mountains, the Caucasus Mountains and the Tibetan Plateau.

### Bidding

Each auction runs for 3 hours with a reserve price of 0.08 ETH. A bid in the final minutes extends the auction by 3 minutes, so there’s always time to respond to a last-second bid.

Outbid? Your bid is refunded in full (less the gas you spent bidding), automatically, in the same transaction as the higher bid.

### Settlement

Anyone can settle an auction once it ends. Settling is a gas-only transaction that sends the Alp to the winner and starts the next auction. If nobody settles, the next auction simply waits until someone does.

Until Alp #14,600, every 10th Alp goes to the founders and every other 5th Alp to the Alpine Council, 10% of supply each. The cut-off is set by Alp number, not by date: at 8 auctions a day it’s about 5 years of auctions. That’s also why settling an auction for an Alp whose number ends in 4 or 9 costs a little more gas: it also mints the reward Alp that comes next.

### Auctions with no bids

Alps that get no bids go to the Alps Warming Hut (warminghut.eth), which holds them for rescues and burns: competitions, giveaways, promotions, charity and burn events.
`,
  },
  {
    id: 'governance',
    title: 'Governance',
    markdown: `
Members spend the treasury and change how Alps works through proposals. A proposal is one or more transactions for the Alps contracts to execute, from sending ETH to a person or project to more complex contract interactions.

### Submitting a proposal

Any member or delegate with at least **1 Alp** (owned or delegated) can submit a proposal. The threshold itself can be changed by proposal.

To propose funding for a project:

1. Open the [Governance page](/vote) and click **Submit Proposal**.
2. Click **Add Transaction**. Enter the recipient’s **address**, then the **value** in ETH. Skip the function and arguments steps (those are for contract interactions), check the summary and add the transaction.
3. Repeat for each extra recipient.
4. Add a title and description. Descriptions support [Markdown](https://www.markdownguide.org/cheat-sheet/); an editor like [HackMD](https://hackmd.io/) or [Dillinger](https://dillinger.io/) lets you preview it.
5. Click **Create Proposal** and confirm the transaction in your wallet. Proposals live on-chain, so submitting one costs gas.

> If your proposal needs to interact with other contracts, ask in [Discord](${DISCORD}) and we’ll help.

### Voting

Each Alp is one vote. You can vote yourself or delegate your votes to someone else, and Safe multisigs can vote too.

Only Alps you held, or that were delegated to you, when a proposal was created count toward it. Buying, selling or delegating afterwards doesn’t change anyone’s votes on existing proposals.

Every proposal goes through the same stages:

- **Voting delay:** voting opens about 3 days after the proposal is created (21,600 blocks).
- **Voting period:** voting stays open for about 4 days (28,800 blocks).
- **Passing:** a proposal passes with more For than Against votes, and For votes from at least 10% of all Alps.
- **Queue:** anyone can queue a passed proposal with a transaction.
- **Execute:** after a 2-day timelock, anyone can execute it, carrying out its transactions.

To vote, open a proposal on the [Governance page](/vote), connect the wallet holding (or delegated) your Alps, choose For, Against or Abstain, add a reason if you like, and submit. Voting costs a small gas fee.

### The founders’ veto

The founders hold a temporary veto to block malicious proposals while Alps is small. It will be removed once the community is ready.
`,
  },
  {
    id: 'get-involved',
    title: 'Get involved',
    markdown: `
Alps doesn’t have a formal team; it’s run by its members. You can contribute by:

- **Becoming a member:** win an Alp at [auction](/) or pick one up on [OpenSea](${OPENSEA}).
- **Offering value:** bring your skills, connections, events and partnerships to the community in [Discord](${DISCORD}).
- **Submitting proposals:** including proposals to be paid for work you do for the club. Contributors, founders included, are only compensated when members vote for it.

The **Alpine Council** is a group of early contributors and supporters who help steward the community, welcome new members and guide initiatives. The Council’s Alps are held in a multisig (alpinecouncil.eth), and Council members decide together in Discord how to vote them, so the Council votes on proposals as one. Existing Council members decide who joins the Council.

The **founders** steer Alps through its early years and aim to hand control over to the members over time.
`,
  },
  {
    id: 'links',
    title: 'Official links',
    markdown: `
For your safety, only use these official links:

- **Auctions:** [alps.wtf](/)
- **Discord:** [discord.gg/V2uNwrwXga](${DISCORD})
- **X:** [@AlpsDAO](https://x.com/AlpsDAO)
- **OpenSea:** [opensea.io/collection/alpsdao](${OPENSEA})
- **Alps Center:** [alps.center](https://alps.center/)
`,
  },
  {
    id: 'contracts',
    title: 'Contracts',
    markdown: `
${contract('Alps (token)', config.addresses.alpsToken, buildEtherscanAddressLink(config.addresses.alpsToken))}

${contract('Auction house', config.addresses.alpsAuctionHouseProxy, buildEtherscanAddressLink(config.addresses.alpsAuctionHouseProxy))}

${contract('Treasury (executor)', config.addresses.alpsDaoExecutor, buildEtherscanAddressLink(config.addresses.alpsDaoExecutor))}

${contract('Governance (governor)', config.addresses.alpsDAOProxy, buildEtherscanAddressLink(config.addresses.alpsDAOProxy))}
`,
  },
];
