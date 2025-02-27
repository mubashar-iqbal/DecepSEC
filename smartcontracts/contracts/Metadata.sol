// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "./SOC_Team.sol";  // Import the SOC access control contract

contract Metadata is SOC_Team {

    // Mapping to store metadata with a unique identifier
    mapping(uint256 => string) private metadataStorage;
    uint256 public metadataCount;

    // Event to log metadata storage
    event MetadataStored(uint256 indexed metadataId, string metadata, address indexed storedBy);

    // Modifier to restrict access to the owner and SOC analysts
    modifier onlyAuthorized() {
        require(msg.sender == owner || isSOCAnalyst(msg.sender), "Unauthorized: Only owner or SOC analysts can access metadata");
        _;
    }

    /**
     * @dev Store new metadata (Restricted to Owner and SOC Analysts)
     * @param _metadata The metadata string to be stored
     */
    function storeMetadata(string memory _metadata) public onlyAuthorized {
        metadataCount++;
        metadataStorage[metadataCount] = _metadata;
        emit MetadataStored(metadataCount, _metadata, msg.sender);
    }

    /**
     * @dev Retrieve stored metadata (Restricted to Owner and SOC Analysts)
     * @param _metadataId The ID of the stored metadata
     * @return The stored metadata string
     */
    function getMetadata(uint256 _metadataId) public view onlyAuthorized returns (string memory) {
        require(bytes(metadataStorage[_metadataId]).length > 0, "No metadata found for this ID");
        return metadataStorage[_metadataId];
    }

    /**
     * @dev Get the total number of stored metadata entries
     * @return The total count of stored metadata
     */
    function getMetadataCount() public view returns (uint256) {
        return metadataCount;
    }

}
