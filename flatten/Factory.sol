// Dependency file: @openzeppelin/contracts/proxy/Clones.sol

// SPDX-License-Identifier: MIT

// pragma solidity ^0.8.0;

/**
 * @dev https://eips.ethereum.org/EIPS/eip-1167[EIP 1167] is a standard for
 * deploying minimal proxy contracts, also known as "clones".
 *
 * > To simply and cheaply clone contract functionality in an immutable way, this standard specifies
 * > a minimal bytecode implementation that delegates all calls to a known, fixed address.
 *
 * The library includes functions to deploy a proxy using either `create` (traditional deployment) or `create2`
 * (salted deterministic deployment). It also includes functions to predict the addresses of clones deployed using the
 * deterministic method.
 *
 * _Available since v3.4._
 */
library Clones {
    /**
     * @dev Deploys and returns the address of a clone that mimics the behaviour of `implementation`.
     *
     * This function uses the create opcode, which should never revert.
     */
    function clone(address implementation) internal returns (address instance) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(ptr, 0x14), shl(0x60, implementation))
            mstore(add(ptr, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
            instance := create(0, ptr, 0x37)
        }
        require(instance != address(0), "ERC1167: create failed");
    }

    /**
     * @dev Deploys and returns the address of a clone that mimics the behaviour of `implementation`.
     *
     * This function uses the create2 opcode and a `salt` to deterministically deploy
     * the clone. Using the same `implementation` and `salt` multiple time will revert, since
     * the clones cannot be deployed twice at the same address.
     */
    function cloneDeterministic(address implementation, bytes32 salt) internal returns (address instance) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(ptr, 0x14), shl(0x60, implementation))
            mstore(add(ptr, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
            instance := create2(0, ptr, 0x37, salt)
        }
        require(instance != address(0), "ERC1167: create2 failed");
    }

    /**
     * @dev Computes the address of a clone deployed using {Clones-cloneDeterministic}.
     */
    function predictDeterministicAddress(address implementation, bytes32 salt, address deployer) internal pure returns (address predicted) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(ptr, 0x14), shl(0x60, implementation))
            mstore(add(ptr, 0x28), 0x5af43d82803e903d91602b57fd5bf3ff00000000000000000000000000000000)
            mstore(add(ptr, 0x38), shl(0x60, deployer))
            mstore(add(ptr, 0x4c), salt)
            mstore(add(ptr, 0x6c), keccak256(ptr, 0x37))
            predicted := keccak256(add(ptr, 0x37), 0x55)
        }
    }

    /**
     * @dev Computes the address of a clone deployed using {Clones-cloneDeterministic}.
     */
    function predictDeterministicAddress(address implementation, bytes32 salt) internal view returns (address predicted) {
        return predictDeterministicAddress(implementation, salt, address(this));
    }
}


// Dependency file: contracts/interfaces/IPool.sol

// pragma solidity >=0.8.4 <0.9.0;

interface IPool {
  function init(
    address registry,
    bytes32 domain
  ) external returns (bool);

}


// Dependency file: contracts/interfaces/IDAO.sol

// pragma solidity >=0.8.4 <0.9.0;

interface IDAO {
  struct Proposal {
    bytes32 proposalDigest;
    int256 vote;
    uint64 expired;
    bool executed;
    bool delegate;
    address target;
    bytes data;
  }

  function init(address _registry, bytes32 _domain) external returns (bool);

  function createProposal(Proposal memory newProposal) external returns (uint256);

  function voteProposal(uint256 proposalId, bool positive) external returns (bool);

  function execute(uint256 proposalId) external returns (bool);
}


// Dependency file: @openzeppelin/contracts/token/ERC20/IERC20.sol


// pragma solidity ^0.8.0;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {
    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `recipient`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);
}


// Dependency file: contracts/libraries/TokenMetadata.sol

// pragma solidity >=0.8.4 <0.9.0;

abstract contract TokenMetadata {
  // Metadata for DAO token initialization
  struct Metadata {
    string symbol;
    string name;
    address genesis;
    address grandDAO;
  }
}


// Dependency file: contracts/interfaces/IDAOToken.sol

// pragma solidity >=0.8.4 <0.9.0;

// import '/home/chiro/gits/infrastructure/node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol';
// import 'contracts/libraries/TokenMetadata.sol';

interface IDAOToken is IERC20 {
  function init(TokenMetadata.Metadata memory metadata) external;

  function votePower(address owner) external view returns (uint256);

}


// Dependency file: contracts/interfaces/IRegistry.sol

// pragma solidity >=0.8.4 <0.9.0;

interface IRegistry {
  event Registered(bytes32 domain, bytes32 indexed name, address indexed addr);

  function isExistRecord(bytes32 domain, bytes32 name) external view returns (bool);

  function set(
    bytes32 domain,
    bytes32 name,
    address addr
  ) external returns (bool);

  function batchSet(
    bytes32[] calldata domains,
    bytes32[] calldata names,
    address[] calldata addrs
  ) external returns (bool);

  function getAddress(bytes32 domain, bytes32 name) external view returns (address);

  function getDomainAndName(address addr) external view returns (bytes32, bytes32);
}


// Dependency file: contracts/libraries/User.sol

// pragma solidity >=0.8.4 <0.9.0;

// import 'contracts/interfaces/IRegistry.sol';

abstract contract User {
  // Registry contract
  IRegistry internal registry;

  // Active domain
  bytes32 internal domain;

  // Allow same domain calls
  modifier onlyAllowSameDomain(bytes32 name) {
    require(msg.sender == registry.getAddress(domain, name), 'User: Only allow call from same domain');
    _;
  }

  // Allow cross domain call
  modifier onlyAllowCrossDomain(bytes32 fromDomain, bytes32 name) {
    require(msg.sender == registry.getAddress(fromDomain, name), 'User: Only allow call from allowed cross domain');
    _;
  }

  // Constructing with registry address and its active domain
  function _init(address _registry, bytes32 _domain) internal returns (bool) {
    require(domain == bytes32(0) && address(registry) == address(0), "User: It's only able to set once");
    registry = IRegistry(_registry);
    domain = _domain;
    return true;
  }

  // Get address in the same domain
  function getAddressSameDomain(bytes32 name) internal view returns (address) {
    return registry.getAddress(domain, name);
  }

  // Return active domain
  function getDomain() external view returns (bytes32) {
    return domain;
  }

  // Return registry address
  function getRegistry() external view returns (address) {
    return address(registry);
  }
}


// Root file: contracts/infrastructure/Factory.sol

pragma solidity >=0.8.4 <0.9.0;

// import '/home/chiro/gits/infrastructure/node_modules/@openzeppelin/contracts/proxy/Clones.sol';
// import 'contracts/interfaces/IPool.sol';
// import 'contracts/interfaces/IDAO.sol';
// import 'contracts/interfaces/IDAOToken.sol';
// import 'contracts/libraries/User.sol';
// import 'contracts/libraries/TokenMetadata.sol';

/**
 * Item manufacture
 * Name: Factory
 * Domain: DKDAO Infrastructure
 */
contract Factory is User {
  // Use clone lib for address
  using Clones for address;

  // New DAO data
  struct NewDAO {
    bytes32 domain;
    TokenMetadata.Metadata tokenMetadata;
  }

  // Pass constructor parameter to User
  constructor(address _registry, bytes32 _domain) {
    _init(_registry, _domain);
  }

  function cloneNewDAO(NewDAO calldata creatingDAO)
    external
    onlyAllowCrossDomain('DKDAO', 'DAO')
    returns (bool)
  {
    // New DAO will be cloned from KDDAO
    address newDAO = registry.getAddress('DKDAO', 'DAO').clone();
    IDAO(newDAO).init(address(registry), creatingDAO.domain);

    // New DAO Token will be cloned from DKDAOToken
    address newDAOToken = registry.getAddress('DKDAO', 'DAOToken').clone();
    IDAOToken(newDAOToken).init(creatingDAO.tokenMetadata);

    // New Pool will be clone from
    address newPool = registry.getAddress('DKDAO', 'Pool').clone();
    IPool(newPool).init(address(registry), creatingDAO.domain);

    return true;
  }
}
