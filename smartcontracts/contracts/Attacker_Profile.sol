// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "./SOC_Team.sol"; // Import SOC Analysts contract for role-based access control

contract AttackerProfile is SOC_Team {
    
    // Mapping to store attacker profile hashes
    mapping(uint256 => string) private attackerProfileHashes;
    uint256 private profileCount;

    // Event to log when a new attacker profile hash is added
    event AttackerProfileAdded(uint256 indexed id, string hash, address indexed addedBy);

    // Modifier to restrict access to only the contract owner and SOC analysts
    modifier onlyAuthorized() {
        require(msg.sender == owner() || isSOCAnalyst(msg.sender), "Access denied: Not authorized");
        _;
    }

    // Function to store a new Attacker Profile hash
    function addAttackerProfile(string memory _hash) external onlyAuthorized {
        attackerProfileHashes[profileCount] = _hash;
        emit AttackerProfileAdded(profileCount, _hash, msg.sender);
        profileCount++;
    }

    // Function to retrieve a specific Attacker Profile hash by ID
    function getAttackerProfile(uint256 _id) external view onlyAuthorized returns (string memory) {
        require(_id < profileCount, "Invalid ID: Profile does not exist");
        return attackerProfileHashes[_id];
    }

    // Function to get the total number of stored Attacker Profiles
    function getAttackerProfileCount() external view returns (uint256) {
        return profileCount;
    }
    
}
