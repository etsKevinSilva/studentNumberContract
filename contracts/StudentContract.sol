// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

contract StudentContract {
    uint public studentNumber;
    address public student;
    mapping(address => uint) public studentToStudentNumber;

    constructor() public {
        student = msg.sender;
        studentToStudentNumber[student] = 0;
    }

    function setStudentNumber(uint _studentNumber) public payable {
        require(msg.value == 5400000000000000 wei, "Must send 0.0054 ETH");
        studentNumber = _studentNumber;
        studentToStudentNumber[student] = _studentNumber;
    }

    function getStudentNumber() public view returns (uint) {
        return studentNumber;
    }
}
