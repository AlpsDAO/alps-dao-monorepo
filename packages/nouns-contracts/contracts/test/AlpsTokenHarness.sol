// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.15;

import { AlpsToken } from '../AlpsToken.sol';
import { IAlpsDescriptorMinimal } from '../interfaces/IAlpsDescriptorMinimal.sol';
import { IAlpsSeeder } from '../interfaces/IAlpsSeeder.sol';
import { IProxyRegistry } from '../external/opensea/IProxyRegistry.sol';

contract AlpsTokenHarness is AlpsToken {
    uint256 public currentAlpId;

    constructor(
        address alpersDAO,
        address minter,
        IAlpsDescriptorMinimal descriptor,
        IAlpsSeeder seeder,
        IProxyRegistry proxyRegistry
    ) AlpsToken(alpersDAO, minter, descriptor, seeder, proxyRegistry) {}

    function mintTo(address to) public {
        _mintTo(to, currentAlpId++);
    }

    function mintMany(address to, uint256 amount) public {
        for (uint256 i = 0; i < amount; i++) {
            mintTo(to);
        }
    }

    function mintSeed(
        address to,
        uint48 background,
        uint48 body,
        uint48 accessory,
        uint48 head,
        uint48 glasses
    ) public {
        seeds[currentAlpId] = IAlpsSeeder.Seed({
            background: background,
            body: body,
            accessory: accessory,
            head: head,
            glasses: glasses
        });

        _mint(owner(), to, currentAlpId++);
    }
}
