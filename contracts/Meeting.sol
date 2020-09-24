// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.8.0;

contract Meeting {
  address public owner = msg.sender;
  uint public time_begin;
  uint public time_end;
  mapping(address => string) public cyphered_votes;
  uint public votes_for;
  uint public votes_against;
  uint public votes_empty;

  modifier restricted() {
    require(
      msg.sender == owner,
      "This function is restricted to the contract's owner"
    );
    _;
  }

  modifier open() {
    require(
      block.timestamp > time_begin && block.timestamp < time_end,
      "This function is restricted to an open contract"
    );
    _;
  }

  modifier after_end() {
    require(
      block.timestamp > time_end,
      "This function is restricted to a finished contract"
    );
    _;
  }

  constructor(uint tb, uint te) public {
    time_begin = tb;
    time_end = te;
  }

  function get_vote_cypher(address addr) public view returns (string memory) {
    return cyphered_votes[addr];
  }

  function set_vote(string memory vote) public open {
    cyphered_votes[msg.sender] = vote;
  }

  function set_result(uint vf, uint va, uint ve) public restricted {
    votes_for = vf;
    votes_against = va;
    votes_empty = ve;
  }
}
