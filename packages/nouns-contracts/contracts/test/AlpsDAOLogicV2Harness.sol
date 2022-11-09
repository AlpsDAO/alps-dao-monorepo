// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import '../governance/AlpsDAOLogicV2.sol';

contract AlpsDAOLogicV2Harness is AlpsDAOLogicV2 {
    function initialize(
        address timelock_,
        address alps_,
        address vetoer_,
        uint256 votingPeriod_,
        uint256 votingDelay_,
        uint256 proposalThresholdBPS_,
        DynamicQuorumParams calldata dynamicQuorumParams_
    ) public override {
        require(msg.sender == admin, 'AlpsDAO::initialize: admin only');
        require(address(timelock) == address(0), 'AlpsDAO::initialize: can only initialize once');

        timelock = IAlpsDAOExecutor(timelock_);
        alps = AlpsTokenLike(alps_);
        vetoer = vetoer_;
        votingPeriod = votingPeriod_;
        votingDelay = votingDelay_;
        proposalThresholdBPS = proposalThresholdBPS_;
        _setDynamicQuorumParams(
            dynamicQuorumParams_.minQuorumVotesBPS,
            dynamicQuorumParams_.maxQuorumVotesBPS,
            dynamicQuorumParams_.quorumCoefficient
        );
    }
}
