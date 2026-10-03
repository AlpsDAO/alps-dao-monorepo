// SPDX-License-Identifier: GPL-3.0

/// @title Signals on Alps proposals, before voting opens

pragma solidity ^0.8.15;

/**
 * @notice Lets anyone post a signal on an Alps proposal: for, against or abstain, with a reason. The Alps
 * governor only takes votes while voting is open, so this is how members say where they stand while a
 * proposal is still pending. A signal is only an event: it changes nothing on-chain and nothing counts
 * it. alps.wtf and the Discord bot show them, weighted by each sender's votes.
 *
 * The function and event match the feedback on Nouns' data contract, so tools that read Nouns feedback
 * can read these too. This contract has no owner and nothing to configure.
 */
contract AlpsFeedback {
    error InvalidSupportValue();

    event FeedbackSent(address indexed msgSender, uint256 proposalId, uint8 support, string reason);

    /**
     * @notice Post a signal on a proposal.
     * @param proposalId the ID of the proposal.
     * @param support 0 is against, 1 is for, 2 is abstain.
     * @param reason free text, which may be empty.
     */
    function sendFeedback(
        uint256 proposalId,
        uint8 support,
        string memory reason
    ) external {
        if (support > 2) revert InvalidSupportValue();

        emit FeedbackSent(msg.sender, proposalId, support, reason);
    }
}
