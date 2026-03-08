// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Election {
    struct Candidate {
        string id;
        string name;
        string party;
        string description;
        string avatarUrl;
        uint256 voteCount;
    }

    struct VoteReceipt {
        string voterHash;
        uint256 timestamp;
        string zkProof;
    }

    address public owner;
    mapping(string => Candidate) public candidates;
    string[] public candidateIds;
    mapping(string => bool) public hasVoted; // voterHash -> bool

    event VoteCast(string indexed voterHash, string indexed candidateId);
    event CandidateAdded(string indexed id, string name);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addCandidate(
        string memory _id,
        string memory _name,
        string memory _party,
        string memory _description,
        string memory _avatarUrl
    ) public onlyOwner {
        require(bytes(candidates[_id].id).length == 0, "Candidate already exists");
        
        candidates[_id] = Candidate({
            id: _id,
            name: _name,
            party: _party,
            description: _description,
            avatarUrl: _avatarUrl,
            voteCount: 0
        });
        
        candidateIds.push(_id);
        emit CandidateAdded(_id, _name);
    }

    function removeCandidate(string memory _id) public onlyOwner {
        delete candidates[_id];
        // Note: For simplicity, we don't remove from candidateIds array here
        // as it would require array manipulation, but in a real app we'd manage this.
    }

    function castVote(
        string memory _voterHash,
        string memory _candidateId,
        string memory _zkProof
    ) public {
        require(!hasVoted[_voterHash], "Voter has already cast a vote");
        require(bytes(candidates[_candidateId].id).length != 0, "Candidate does not exist");

        // In a real ZK application, we would verify the proof here.
        // For this demo, we assume the proof passed by the backend is valid.

        candidates[_candidateId].voteCount += 1;
        hasVoted[_voterHash] = true;

        emit VoteCast(_voterHash, _candidateId);
    }

    function getCandidateCount() public view returns (uint256) {
        return candidateIds.length;
    }

    function getCandidate(string memory _id) public view returns (
        string memory id,
        string memory name,
        string memory party,
        string memory description,
        string memory avatarUrl,
        uint256 voteCount
    ) {
        Candidate memory c = candidates[_id];
        return (c.id, c.name, c.party, c.description, c.avatarUrl, c.voteCount);
    }

    function getAllCandidateIds() public view returns (string[] memory) {
        return candidateIds;
    }
}
