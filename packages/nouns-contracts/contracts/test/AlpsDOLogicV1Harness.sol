// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import '../governance/AlpsDAOLogicV1.sol';

contract AlpsDAOLogicV1Harness is AlpsDAOLogicV1 {
    function initialize(
        address timelock_,
        address alps_,
        address vetoer_,
        uint256 votingPeriod_,
        uint256 votingDelay_,
        uint256 proposalThresholdBPS_,
        uint256 quorumVotesBPS_
    ) public override {
        require(msg.sender == admin, 'AlpsDAO::initialize: admin only');
        require(address(timelock) == address(0), 'AlpsDAO::initialize: can only initialize once');

        timelock = IAlpsDAOExecutor(timelock_);
        alps = AlpsTokenLike(alps_);
        vetoer = vetoer_;
        votingPeriod = votingPeriod_;
        votingDelay = votingDelay_;
        proposalThresholdBPS = proposalThresholdBPS_;
        quorumVotesBPS = quorumVotesBPS_;
    }
}
