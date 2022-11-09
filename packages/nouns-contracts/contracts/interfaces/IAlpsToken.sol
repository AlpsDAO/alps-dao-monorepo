// SPDX-License-Identifier: GPL-3.0

/// @title Interface for AlpsToken

/*********************************
 * ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ *
 * ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ *
 * ░░░░░░█████████░░█████████░░░ *
 * ░░░░░░██░░░████░░██░░░████░░░ *
 * ░░██████░░░████████░░░████░░░ *
 * ░░██░░██░░░████░░██░░░████░░░ *
 * ░░██░░██░░░████░░██░░░████░░░ *
 * ░░░░░░█████████░░█████████░░░ *
 * ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ *
 * ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ *
 *********************************/

pragma solidity ^0.8.6;

import { IERC721 } from '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import { IAlpsDescriptorMinimal } from './IAlpsDescriptorMinimal.sol';
import { IAlpsSeeder } from './IAlpsSeeder.sol';

interface IAlpsToken is IERC721 {
    event AlpCreated(uint256 indexed tokenId, IAlpsSeeder.Seed seed);

    event AlpBurned(uint256 indexed tokenId);

    event AlpersDAOUpdated(address alpersDAO);

    event MinterUpdated(address minter);

    event MinterLocked();

    event DescriptorUpdated(IAlpsDescriptorMinimal descriptor);

    event DescriptorLocked();

    event SeederUpdated(IAlpsSeeder seeder);

    event SeederLocked();

    function mint() external returns (uint256);

    function burn(uint256 tokenId) external;

    function dataURI(uint256 tokenId) external returns (string memory);

    function setAlpersDAO(address alpersDAO) external;

    function setMinter(address minter) external;

    function lockMinter() external;

    function setDescriptor(IAlpsDescriptorMinimal descriptor) external;

    function lockDescriptor() external;

    function setSeeder(IAlpsSeeder seeder) external;

    function lockSeeder() external;
}
