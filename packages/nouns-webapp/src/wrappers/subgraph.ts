import { ApolloClient, InMemoryCache, gql } from '@apollo/client';
import { BigNumberish } from '@ethersproject/bignumber';
import BigNumber from 'bignumber.js';

export interface IBid {
  id: string;
  bidder: {
    id: string;
  };
  amount: BigNumber;
  blockNumber: number;
  blockTimestamp: number;
  txIndex?: number;
  alp: {
    id: number;
    startTime?: BigNumberish;
    endTime?: BigNumberish;
    settled?: boolean;
  };
}

interface ProposalVote {
  supportDetailed: 0 | 1 | 2;
  voter: {
    id: string;
  };
}

export interface ProposalVotes {
  votes: ProposalVote[];
}

export interface Delegate {
  id: string;
  alpsRepresented: {
    id: string;
  }[];
}

export interface Delegates {
  delegates: Delegate[];
}

export const seedsQuery = (first = 1_000) => gql`
{
  seeds(first: ${first}) {
    id
    background
    body
    accessory
    head
    glasses
  }
}
`;

export const proposalsQuery = (first = 1_000) => gql`
{
  proposals(first: ${first}, orderBy: createdBlock, orderDirection: asc) {
    id
    description
    status
    proposalThreshold
    quorumVotes
    forVotes
    againstVotes
    abstainVotes
    createdTransactionHash
    createdBlock
    startBlock
    endBlock
    executionETA
    targets
    values
    signatures
    calldatas
    proposer {
      id
    }
  }
}
`;

export const auctionQuery = (auctionId: number) => gql`
{
	auction(id: ${auctionId}) {
	  id
	  amount
	  settled
	  bidder {
	  	id
	  }
	  startTime
	  endTime
	  alp {
		id
		seed {
		  id
		  background
		  body
		  accessory
		  head
		  glasses
		}
		owner {
		  id
		}
	  }
	  bids {
		id
		blockNumber
		txIndex
		amount
	  }
	}
}
`;

export const bidsByAuctionQuery = (auctionId: string) => gql`
 {
	bids(where:{auction: "${auctionId}"}) {
	  id
	  amount
	  blockNumber
	  blockTimestamp
	  txIndex
	  bidder {
	  	id
	  }
	  alp {
		id
	  }
	}
  }
 `;

export const alpQuery = (id: string) => gql`
 {
	alp(id:"${id}") {
	  id
	  seed {
	  background
		body
		accessory
		head
		glasses
	}
	  owner {
		id
	  }
	}
  }
 `;

export const alpsIndex = () => gql`
  {
    alps {
      id
      owner {
        id
      }
    }
  }
`;

export const latestAuctionsQuery = () => gql`
  {
    auctions(orderBy: startTime, orderDirection: desc, first: 1000) {
      id
      amount
      settled
      bidder {
        id
      }
      startTime
      endTime
      alp {
        id
        owner {
          id
        }
      }
      bids {
        id
        amount
        blockNumber
        blockTimestamp
        txIndex
        bidder {
          id
        }
      }
    }
  }
`;

export const latestBidsQuery = (first: number = 10) => gql`
{
	bids(
	  first: ${first},
	  orderBy:blockTimestamp,
	  orderDirection: desc
	) {
	  id
	  bidder {
		id
	  }
	  amount
	  blockTimestamp
	  txIndex
	  blockNumber
	  auction {
		id
		startTime
		endTime
		settled
	  }
	}
  }  
`;

export const alpVotingHistoryQuery = (alpId: number) => gql`
{
	alp(id: ${alpId}) {
		id
		votes {
      blockNumber
      proposal {
        id
      }
      support
      supportDetailed
      voter {
        id
      }
		}
	}
}
`;

export const alpTransferHistoryQuery = (alpId: number) => gql`
{
  transferEvents(where: {alp: "${alpId}"}) {
    id
    previousHolder {
      id
    }
    newHolder {
      id
    }
    blockNumber
  }
}
`;

export const alpDelegationHistoryQuery = (alpId: number) => gql`
{
  delegationEvents(where: {alp: "${alpId}"}) {
    id
    previousDelegate {
      id
    }
    newDelegate {
      id
    }
    blockNumber
  }
}
`;

export const createTimestampAllProposals = () => gql`
  {
    proposals(orderBy: createdTimestamp, orderDirection: asc, first: 1000) {
      id
      createdTimestamp
    }
  }
`;

export const proposalVotesQuery = (proposalId: string) => gql`
  {
    votes(where: { proposal: "${proposalId}", votesRaw_gt: 0 }) {
      supportDetailed
      voter {
        id
      }

    }	
  }
`;

export const delegateAlpsAtBlockQuery = (delegates: string[], block: number) => gql`
{
  delegates(where: { id_in: ${JSON.stringify(delegates)} }, block: { number: ${block} }) {
    id
    alpsRepresented {
      id
    }
  }
}
`;

export const currentlyDelegatedAlps = (delegate: string) => gql`
{
  delegates(where: { id: "${delegate}"} ) {
    id
    alpsRepresented {
      id
    }
  }
}
`;

export const totalAlpSupplyAtPropSnapshot = (proposalId: string) => gql`
{
  proposals(where: {id: ${proposalId}}) {
    totalSupply
  }
}
`;

export const propUsingDynamicQuorum = (propoaslId: string) => gql`
{
  proposal(id: "${propoaslId}") {
    quorumCoefficient 
  }
}
`;

export const clientFactory = (uri: string) =>
  new ApolloClient({
    uri,
    cache: new InMemoryCache(),
  });
