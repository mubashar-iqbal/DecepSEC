// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

contract DigitalTwinHashStorage {

    // Mapping to store digital twin model hashes against a unique ID
    mapping(string => bytes32) private twinModelHashes;

    // Event emitted whenever a hash is added or updated
    event HashStored(string modelId, bytes32 hash);

    // Function to store or update the hash of a digital twin model
    function storeHash(string memory modelId, bytes32 hash) public {
        twinModelHashes[modelId] = hash;
        emit HashStored(modelId, hash);
    }

    // Function to retrieve the hash for a given modelId
    function getHash(string memory modelId) public view returns (bytes32) {
        require(twinModelHashes[modelId] != 0, "Model ID does not exist");
        return twinModelHashes[modelId];
    }

    // Function to verify if a given hash matches the stored hash for a specific modelId
    function verifyHash(string memory modelId, bytes32 hash) public view returns (bool) {
        require(twinModelHashes[modelId] != 0, "Model ID does not exist");
        return twinModelHashes[modelId] == hash;
    }

}
