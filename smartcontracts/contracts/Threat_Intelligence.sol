// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "./SOC_Team.sol"; // Importing SOC Analysts contract for access control

contract ThreatIntelligence is SOC_Team {
    
    // Mapping to store threat intelligence hashes
    mapping(uint256 => string) private threatIntelligenceHashes;
    uint256 private hashCount;

    // Event to log when a new TI hash is added
    event ThreatIntelligenceAdded(uint256 indexed id, string hash, address indexed addedBy);

    // Modifier to restrict access to only the contract owner and SOC analysts
    modifier onlyAuthorized() {
        require(msg.sender == owner() || isSOCAnalyst(msg.sender), "Access denied: Not authorized");
        _;
    }

    // Function to store a new Threat Intelligence hash
    function addThreatIntelligence(string memory _hash) external onlyAuthorized {
        threatIntelligenceHashes[hashCount] = _hash;
        emit ThreatIntelligenceAdded(hashCount, _hash, msg.sender);
        hashCount++;
    }

    // Function to retrieve a specific TI hash by ID
    function getThreatIntelligence(uint256 _id) external view onlyAuthorized returns (string memory) {
        require(_id < hashCount, "Invalid ID: Hash does not exist");
        return threatIntelligenceHashes[_id];
    }

    // Function to get the total number of stored TI hashes
    function getThreatIntelligenceCount() external view returns (uint256) {
        return hashCount;
    }

}
