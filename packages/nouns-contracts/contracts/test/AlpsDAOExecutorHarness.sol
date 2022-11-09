// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import '../governance/AlpsDAOExecutor.sol';

interface Administered {
    function _acceptAdmin() external returns (uint256);
}

contract AlpsDAOExecutorHarness is AlpsDAOExecutor {
    constructor(address admin_, uint256 delay_) AlpsDAOExecutor(admin_, delay_) {}

    function harnessSetPendingAdmin(address pendingAdmin_) public {
        pendingAdmin = pendingAdmin_;
    }

    function harnessSetAdmin(address admin_) public {
        admin = admin_;
    }
}

contract AlpsDAOExecutorTest is AlpsDAOExecutor {
    constructor(address admin_, uint256 delay_) AlpsDAOExecutor(admin_, 2 days) {
        delay = delay_;
    }

    function harnessSetAdmin(address admin_) public {
        require(msg.sender == admin);
        admin = admin_;
    }

    function harnessAcceptAdmin(Administered administered) public {
        administered._acceptAdmin();
    }
}
