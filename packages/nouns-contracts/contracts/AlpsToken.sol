// SPDX-License-Identifier: GPL-3.0

/// @title The Alps ERC-721 token

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

import { Ownable } from '@openzeppelin/contracts/access/Ownable.sol';
import { ERC721Checkpointable } from './base/ERC721Checkpointable.sol';
import { IAlpsDescriptorMinimal } from './interfaces/IAlpsDescriptorMinimal.sol';
import { IAlpsSeeder } from './interfaces/IAlpsSeeder.sol';
import { IAlpsToken } from './interfaces/IAlpsToken.sol';
import { ERC721 } from './base/ERC721.sol';
import { IERC721 } from '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import { IProxyRegistry } from './external/opensea/IProxyRegistry.sol';

contract AlpsToken is IAlpsToken, Ownable, ERC721Checkpointable {
    // alps Council
    address public alpsCouncil = 0x6F895beCD7bf90A5C7d1766a1EcA13b1d087dE05;

    // The alpers DAO address (creators org)
    address public alpersDAO;

    // An address who has permissions to mint Alps
    address public minter;

    // The Alps token URI descriptor
    IAlpsDescriptorMinimal public descriptor;

    // The Alps token seeder
    IAlpsSeeder public seeder;

    // Whether the minter can be updated
    bool public isMinterLocked;

    // Whether the descriptor can be updated
    bool public isDescriptorLocked;

    // Whether the seeder can be updated
    bool public isSeederLocked;

    // The alp seeds
    mapping(uint256 => IAlpsSeeder.Seed) public seeds;

    // The internal alp ID tracker
    uint256 private _currentAlpId;

    // IPFS content hash of contract-level metadata
    string private _contractURIHash = 'QmYxzhCuw1zV9bqFG3gKJqpow5Ab88c1613Nmtv58pKiZQ';

    // OpenSea's Proxy Registry
    IProxyRegistry public immutable proxyRegistry;

    /**
     * @notice Require that the minter has not been locked.
     */
    modifier whenMinterNotLocked() {
        require(!isMinterLocked, 'Minter is locked');
        _;
    }

    /**
     * @notice Require that the descriptor has not been locked.
     */
    modifier whenDescriptorNotLocked() {
        require(!isDescriptorLocked, 'Descriptor is locked');
        _;
    }

    /**
     * @notice Require that the seeder has not been locked.
     */
    modifier whenSeederNotLocked() {
        require(!isSeederLocked, 'Seeder is locked');
        _;
    }

    /**
     * @notice Require that the sender is the alpers DAO.
     */
    modifier onlyAlpersDAO() {
        require(msg.sender == alpersDAO, 'Sender is not the alpers DAO');
        _;
    }

    /**
     * @notice Require that the sender is the minter.
     */
    modifier onlyMinter() {
        require(msg.sender == minter, 'Sender is not the minter');
        _;
    }

    constructor(
        address _alpersDAO,
        address _minter,
        IAlpsDescriptorMinimal _descriptor,
        IAlpsSeeder _seeder,
        IProxyRegistry _proxyRegistry
    ) ERC721('Alps DAO', 'ALPS') {
        alpersDAO = _alpersDAO;
        minter = _minter;
        descriptor = _descriptor;
        seeder = _seeder;
        proxyRegistry = _proxyRegistry;
    }

    /**
     * @notice The IPFS URI of contract-level metadata.
     */
    function contractURI() public view returns (string memory) {
        return string(abi.encodePacked('ipfs://', _contractURIHash));
    }

    /**
     * @notice Set the _contractURIHash.
     * @dev Only callable by the owner.
     */
    function setContractURIHash(string memory newContractURIHash) external onlyOwner {
        _contractURIHash = newContractURIHash;
    }

    /**
     * @notice Override isApprovedForAll to whitelist user's OpenSea proxy accounts to enable gas-less listings.
     */
    function isApprovedForAll(address owner, address operator) public view override(IERC721, ERC721) returns (bool) {
        // Whitelist OpenSea proxy contract for easy trading.
        if (proxyRegistry.proxies(owner) == operator) {
            return true;
        }
        return super.isApprovedForAll(owner, operator);
    }

    /**
     * @notice Mint a Alp to the minter, along with a possible alpers reward
     * Alp. Alpers reward Alps are minted every 10 Alps, starting at 0,
     * until 1460 alpder Alps have been minted (5 years w/ 3 hour auctions).
     * @dev Call _mintTo with the to address(es).
     */
    function mint() public override onlyMinter returns (uint256) {
        if (_currentAlpId <= 14600 && _currentAlpId % 10 == 0) {
            _mintTo(alpersDAO, _currentAlpId++);
        } else if (_currentAlpId <= 14600 && _currentAlpId % 5 == 0) {
            _mintTo(alpsCouncil, _currentAlpId++);
        }
        return _mintTo(minter, _currentAlpId++);
    }

    /**
     * @notice Burn a alp.
     */
    function burn(uint256 alpId) public override onlyMinter {
        _burn(alpId);
        emit AlpBurned(alpId);
    }

    /**
     * @notice A distinct Uniform Resource Identifier (URI) for a given asset.
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), 'AlpsToken: URI query for nonexistent token');
        return descriptor.tokenURI(tokenId, seeds[tokenId]);
    }

    /**
     * @notice Similar to `tokenURI`, but always serves a base64 encoded data URI
     * with the JSON contents directly inlined.
     */
    function dataURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), 'AlpsToken: URI query for nonexistent token');
        return descriptor.dataURI(tokenId, seeds[tokenId]);
    }

    /**
     * @notice Set the alpers DAO.
     * @dev Only callable by the alpers DAO when not locked.
     */
    function setAlpersDAO(address _alpersDAO) external override onlyAlpersDAO {
        alpersDAO = _alpersDAO;

        emit AlpersDAOUpdated(_alpersDAO);
    }

    function setAlpsCouncil(address _alpsCouncil) external onlyAlpersDAO {
        alpsCouncil = _alpsCouncil;
    }

    /**
     * @notice Set the token minter.
     * @dev Only callable by the owner when not locked.
     */
    function setMinter(address _minter) external override onlyOwner whenMinterNotLocked {
        minter = _minter;

        emit MinterUpdated(_minter);
    }

    /**
     * @notice Lock the minter.
     * @dev This cannot be reversed and is only callable by the owner when not locked.
     */
    function lockMinter() external override onlyOwner whenMinterNotLocked {
        isMinterLocked = true;

        emit MinterLocked();
    }

    /**
     * @notice Set the token URI descriptor.
     * @dev Only callable by the owner when not locked.
     */
    function setDescriptor(IAlpsDescriptorMinimal _descriptor) external override onlyOwner whenDescriptorNotLocked {
        descriptor = _descriptor;

        emit DescriptorUpdated(_descriptor);
    }

    /**
     * @notice Lock the descriptor.
     * @dev This cannot be reversed and is only callable by the owner when not locked.
     */
    function lockDescriptor() external override onlyOwner whenDescriptorNotLocked {
        isDescriptorLocked = true;

        emit DescriptorLocked();
    }

    /**
     * @notice Set the token seeder.
     * @dev Only callable by the owner when not locked.
     */
    function setSeeder(IAlpsSeeder _seeder) external override onlyOwner whenSeederNotLocked {
        seeder = _seeder;

        emit SeederUpdated(_seeder);
    }

    /**
     * @notice Lock the seeder.
     * @dev This cannot be reversed and is only callable by the owner when not locked.
     */
    function lockSeeder() external override onlyOwner whenSeederNotLocked {
        isSeederLocked = true;

        emit SeederLocked();
    }

    /**
     * @notice Mint a Alp with `alpId` to the provided `to` address.
     */
    function _mintTo(address to, uint256 alpId) internal returns (uint256) {
        IAlpsSeeder.Seed memory seed = seeds[alpId] = seeder.generateSeed(alpId, descriptor);

        _mint(owner(), to, alpId);
        emit AlpCreated(alpId, seed);

        return alpId;
    }
}
