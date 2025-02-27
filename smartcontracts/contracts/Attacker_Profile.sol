// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

contract Attacker_Profile {
    // Contract owner
    address public owner;

    // Mapping to store attacker profile hashes
    mapping(uint256 => string) private attackerProfiles;
    uint256 public profileCount;

    // Mapping for authorized SOC analysts
    mapping(address => bool) private authorizedSOC;

    // Events for logging actions
    event AttackerProfileStored(uint256 indexed profileId, string hash, address indexed storedBy);
    event SOCAnalystAdded(address indexed analyst);
    event SOCAnalystRemoved(address indexed analyst);

    // Modifier to restrict actions to the contract owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Unauthorized: Only owner can perform this action");
        _;
    }

    // Modifier to restrict actions to the owner or SOC analysts
    modifier onlyAuthorized() {
        require(msg.sender == owner || authorizedSOC[msg.sender], "Unauthorized: Only owner or SOC analysts can access this data");
        _;
    }

    // Constructor to set the deployer as the owner
    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Store a new attacker profile hash
     * @param _hash The hash of the gathered attacker profile
     */
    function storeAttackerProfile(string memory _hash) public onlyOwner {
        profileCount++;
        attackerProfiles[profileCount] = _hash;
        emit AttackerProfileStored(profileCount, _hash, msg.sender);
    }

    /**
     * @dev Retrieve a stored attacker profile hash (Restricted to Owner and SOC Analysts)
     * @param _profileId The ID of the stored attacker profile
     * @return The hash of the requested attacker profile
     */
    function getAttackerProfile(uint256 _profileId) public view onlyAuthorized returns (string memory) {
        require(bytes(attackerProfiles[_profileId]).length > 0, "No attacker profile found for this ID");
        return attackerProfiles[_profileId];
    }

    /**
     * @dev Get the total number of stored attacker profiles
     * @return The total count of stored attacker profiles
     */
    function getProfileCount() public view returns (uint256) {
        return profileCount;
    }

    /**
     * @dev Add a new SOC analyst (Only Owner can call this)
     * @param _analyst The address of the SOC analyst to be added
     */
    function addSOCAnalyst(address _analyst) public onlyOwner {
        require(!authorizedSOC[_analyst], "Analyst is already authorized");
        authorizedSOC[_analyst] = true;
        emit SOCAnalystAdded(_analyst);
    }

    /**
     * @dev Remove an existing SOC analyst (Only Owner can call this)
     * @param _analyst The address of the SOC analyst to be removed
     */
    function removeSOCAnalyst(address _analyst) public onlyOwner {
        require(authorizedSOC[_analyst], "Analyst is not authorized");
        authorizedSOC[_analyst] = false;
        emit SOCAnalystRemoved(_analyst);
    }

    /**
     * @dev Check if an address is an authorized SOC analyst
     * @param _analyst The address to check
     * @return True if the address is an authorized SOC analyst, otherwise false
     */
    function isSOCAnalyst(address _analyst) public view returns (bool) {
        return authorizedSOC[_analyst];
    }
}
