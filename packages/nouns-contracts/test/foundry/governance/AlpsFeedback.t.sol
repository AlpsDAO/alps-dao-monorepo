// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.15;

import 'forge-std/Test.sol';
import { AlpsFeedback } from '../../../contracts/governance/AlpsFeedback.sol';

contract AlpsFeedbackTest is Test {
    event FeedbackSent(address indexed msgSender, uint256 proposalId, uint8 support, string reason);

    AlpsFeedback feedback;
    address member = address(0xA1);

    function setUp() public {
        feedback = new AlpsFeedback();
    }

    function test_sendFeedback_emitsTheSignalWithTheSender() public {
        vm.expectEmit(true, true, true, true);
        emit FeedbackSent(member, 8, 0, 'not for this');
        vm.prank(member);
        feedback.sendFeedback(8, 0, 'not for this');
    }

    function test_sendFeedback_takesForAgainstAndAbstainWithOrWithoutAReason() public {
        for (uint8 support = 0; support <= 2; support++) {
            vm.expectEmit(true, true, true, true);
            emit FeedbackSent(member, 9, support, '');
            vm.prank(member);
            feedback.sendFeedback(9, support, '');
        }
    }

    function test_sendFeedback_refusesAnyOtherSupportValue() public {
        vm.expectRevert(AlpsFeedback.InvalidSupportValue.selector);
        feedback.sendFeedback(8, 3, 'maybe');
    }

    /// The same function selector and event topic as Nouns' data contract (read from mainnet)
    function test_matchesNounsFeedback() public {
        assertEq(AlpsFeedback.sendFeedback.selector, bytes4(0xff4ca184));
        vm.recordLogs();
        feedback.sendFeedback(1, 1, 'yes');
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs[0].topics[0], 0x66777d398af2d3ad91be043f4ee15e0058fd64a2badd9977e29334dc608bbfa6);
    }
}
