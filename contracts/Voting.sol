pragma solidity ^0.5.15;

contract Voting {
    struct Candidate {
        uint id;
        string name;
        string party; 
        string encryptedVoteSum; // Store as string for flexibility with large numbers/hashes
    }

    struct Voter {
        bool hasVoted;
        string biometricHash; // Secure hashed template
        bool isVerified;
    }

    mapping (uint => Candidate) public candidates;
    mapping (address => Voter) public voters;
    
    uint public countCandidates;
    uint256 public votingEnd;
    uint256 public votingStart;
    address public electionAuthority;

    event VoteCast(address voter, uint candidateId, string encryptedVote);
    event VoterRegistered(address voter, string biometricHash);

    constructor() public {
        electionAuthority = msg.sender;
    }

    modifier onlyAuthority() {
        require(msg.sender == electionAuthority, "Only authority can perform this action");
        _;
    }

    function registerVoter(address _voter, string memory _biometricHash) public onlyAuthority {
        voters[_voter] = Voter(false, _biometricHash, true);
        emit VoterRegistered(_voter, _biometricHash);
    }

    function addCandidate(string memory name, string memory party) public onlyAuthority returns(uint) {
        countCandidates ++;
        candidates[countCandidates] = Candidate(countCandidates, name, party, "0");
        return countCandidates;
    }
   
    function castVote(uint candidateID, string memory encryptedVote, string memory zkProof) public {
        require((votingStart <= now) && (votingEnd > now), "Election not active");
        require(candidateID > 0 && candidateID <= countCandidates, "Invalid candidate");
        require(voters[msg.sender].isVerified, "Voter not verified via biometrics");
        require(!voters[msg.sender].hasVoted, "Already voted");

        // In a real implementation, we would verify the zkProof here
        // if (!verifyZkProof(zkProof)) revert("Invalid ZK Proof");
              
        voters[msg.sender].hasVoted = true;
        
        // In a real Homomorphic system, we aggregate the encrypted vote on-chain or off-chain
        // For this implementation, we emit an event for specialized nodes to aggregate
        emit VoteCast(msg.sender, candidateID, encryptedVote);
    }
    
    function setDates(uint256 _startDate, uint256 _endDate) public onlyAuthority {
        require(_endDate > _startDate, "Invalid dates");
        votingEnd = _endDate;
        votingStart = _startDate;
    }

    function getCandidate(uint candidateID) public view returns (uint, string memory, string memory) {
        return (candidateID, candidates[candidateID].name, candidates[candidateID].party);
    }
}
