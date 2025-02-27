// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "./SOC_Team.sol";  // Import the SOC Access Control contract

contract Deception_Rules is SOC_Team {

    // Mapping to store deception rules with unique identifiers
    mapping(uint256 => string) private deceptionRules;
    uint256 public ruleCount;

    // Event to log deception rule storage
    event DeceptionRuleStored(uint256 indexed ruleId, string rule, address indexed storedBy);
    event DeceptionRuleUpdated(uint256 indexed ruleId, string updatedRule, address indexed updatedBy);

    // Modifier to restrict access to the owner and SOC analysts
    modifier onlyAuthorized() {
        require(msg.sender == owner || isSOCAnalyst(msg.sender), "Unauthorized: Only owner or SOC analysts can access this function");
        _;
    }

    /**
     * @dev Store a new deception rule (Restricted to Owner and SOC Analysts)
     * @param _rule The deception rule string to be stored
     */
    function storeDeceptionRule(string memory _rule) public onlyAuthorized {
        ruleCount++;
        deceptionRules[ruleCount] = _rule;
        emit DeceptionRuleStored(ruleCount, _rule, msg.sender);
    }

    /**
     * @dev Update an existing deception rule (Restricted to Owner and SOC Analysts)
     * @param _ruleId The ID of the deception rule to update
     * @param _updatedRule The new rule string
     */
    function updateDeceptionRule(uint256 _ruleId, string memory _updatedRule) public onlyAuthorized {
        require(bytes(deceptionRules[_ruleId]).length > 0, "No deception rule found for this ID");
        deceptionRules[_ruleId] = _updatedRule;
        emit DeceptionRuleUpdated(_ruleId, _updatedRule, msg.sender);
    }

    /**
     * @dev Retrieve a stored deception rule (Restricted to Owner and SOC Analysts)
     * @param _ruleId The ID of the stored deception rule
     * @return The stored deception rule string
     */
    function getDeceptionRule(uint256 _ruleId) public view onlyAuthorized returns (string memory) {
        require(bytes(deceptionRules[_ruleId]).length > 0, "No deception rule found for this ID");
        return deceptionRules[_ruleId];
    }

    /**
     * @dev Get the total number of stored deception rules
     * @return The total count of stored deception rules
     */
    function getRuleCount() public view returns (uint256) {
        return ruleCount;
    }

}
